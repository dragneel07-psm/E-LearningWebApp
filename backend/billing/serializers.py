from rest_framework import serializers
from decimal import Decimal
from .models import Subscription, SubscriptionPlan, SubscriptionPlanHistory, Invoice, FeeStructure, StudentFee, Payment, Expense
from core.utils.plan_enforcement import (
    sync_subscription_limits_with_plan,
    sync_tenant_with_plan,
    record_subscription_plan_history,
)

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        monthly = attrs.get('price_monthly', getattr(instance, 'price_monthly', None))
        yearly = attrs.get('price_yearly', getattr(instance, 'price_yearly', None))

        if monthly is None or yearly is None:
            return attrs

        monthly_dec = Decimal(str(monthly))
        yearly_dec = Decimal(str(yearly))
        if monthly_dec <= 0:
            raise serializers.ValidationError({'price_monthly': 'Monthly price must be greater than zero.'})

        annual_monthly = monthly_dec * Decimal('12')
        min_benefit_percent = Decimal('50')
        min_yearly_discount = annual_monthly * (min_benefit_percent / Decimal('100'))
        max_yearly_price = annual_monthly - min_yearly_discount

        if yearly_dec > max_yearly_price:
            raise serializers.ValidationError({
                'price_yearly': f'Yearly price must provide at least {int(min_benefit_percent)}% benefit over monthly billing.'
            })

        return attrs

    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    # Optional: Embed plan details or just ID
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    
    class Meta:
        model = Subscription
        fields = '__all__'

    def create(self, validated_data):
        request = self.context.get('request')
        subscription = super().create(validated_data)
        if subscription.plan:
            sync_subscription_limits_with_plan(subscription, plan=subscription.plan, save=True)
            sync_tenant_with_plan(subscription.tenant, plan=subscription.plan, save=True)
        record_subscription_plan_history(
            subscription,
            previous_plan=None,
            previous_status='',
            previous_billing_cycle='',
            reason='Subscription created',
            changed_by=getattr(request, 'user', None),
        )
        return subscription

    def update(self, instance, validated_data):
        request = self.context.get('request')
        previous_plan = instance.plan
        previous_status = instance.status
        previous_billing_cycle = instance.billing_cycle

        subscription = super().update(instance, validated_data)
        if subscription.plan:
            sync_subscription_limits_with_plan(subscription, plan=subscription.plan, save=True)
            sync_tenant_with_plan(subscription.tenant, plan=subscription.plan, save=True)

        should_log = (
            previous_plan != subscription.plan
            or previous_status != subscription.status
            or previous_billing_cycle != subscription.billing_cycle
        )
        if should_log:
            reason = request.data.get('reason') if request is not None else None
            record_subscription_plan_history(
                subscription,
                previous_plan=previous_plan,
                previous_status=previous_status,
                previous_billing_cycle=previous_billing_cycle,
                reason=reason or 'Subscription updated',
                changed_by=getattr(request, 'user', None),
            )
        return subscription


class SubscriptionPlanHistorySerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlanHistory
        fields = '__all__'

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return None
        full_name = f"{obj.changed_by.first_name} {obj.changed_by.last_name}".strip()
        return full_name or obj.changed_by.email

class InvoiceSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    plan_name = serializers.CharField(source='subscription.plan.name', read_only=True, default="N/A")

    class Meta:
        model = Invoice
        fields = '__all__'

# ==========================================
# SCHOOL FINANCE SERIALIZERS
# ==========================================

class FeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='academic_class.__str__', read_only=True)
    
    class Meta:
        model = FeeStructure
        fields = '__all__'

class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    fee_name = serializers.CharField(source='fee_structure.name', read_only=True)
    balance = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentFee
        fields = '__all__'
    
    def get_balance(self, obj):
        return float(obj.amount_due - obj.amount_paid)

class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = Expense
        fields = '__all__'

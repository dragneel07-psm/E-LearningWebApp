from rest_framework import serializers
from .models import Subscription, SubscriptionPlan, Invoice, FeeStructure, StudentFee, Payment, Expense

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    # Optional: Embed plan details or just ID
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    
    class Meta:
        model = Subscription
        fields = '__all__'

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

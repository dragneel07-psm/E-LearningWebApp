from django.db import models
from django.db import connection
import uuid as uuid_lib
from core.models.tenant import Tenant
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError


def _current_schema_name() -> str:
    return str(getattr(connection, "schema_name", "public") or "public").strip().lower()


class SchemaScopedBillingModel(models.Model):
    SCHEMA_SCOPE = "any"  # "public" | "tenant" | "any"

    class Meta:
        abstract = True

    def _validate_schema_scope(self):
        schema_name = _current_schema_name()
        if self.SCHEMA_SCOPE == "public" and schema_name != "public":
            raise ValidationError(
                f"{self.__class__.__name__} is public-schema only and cannot be saved in '{schema_name}' schema."
            )
        if self.SCHEMA_SCOPE == "tenant" and schema_name == "public":
            raise ValidationError(
                f"{self.__class__.__name__} is tenant-schema only and cannot be saved in public schema."
            )

    def save(self, *args, **kwargs):
        self._validate_schema_scope()
        return super().save(*args, **kwargs)

class SubscriptionPlan(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    plan_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default='USD')
    
    # Limits
    student_limit = models.IntegerField(default=100)
    teacher_limit = models.IntegerField(default=10)
    storage_limit_gb = models.IntegerField(default=10)
    ai_token_limit = models.IntegerField(default=50000)
    
    # Feature Flags
    has_ai_tutor = models.BooleanField(default=False)
    has_ai_eval = models.BooleanField(default=False)
    has_parent_portal = models.BooleanField(default=False)
    has_analytics = models.BooleanField(default=False)
    has_career_guidance = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Subscription(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    subscription_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='subscription')
    # Link to plan
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status & Billing
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('cancelled', 'Cancelled'),
        ('trial', 'Trial'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    billing_cycle = models.CharField(max_length=20, choices=(('monthly', 'Monthly'), ('yearly', 'Yearly')), default='monthly')
    
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    
    # Usage Tracking (Snapshot from plan or custom overrides)
    student_limit = models.IntegerField(default=100)
    storage_limit_gb = models.IntegerField(default=10)
    ai_token_limit = models.IntegerField(default=50000)

    def __str__(self):
        return f"{self.tenant.name} - {self.plan.name if self.plan else 'No Plan'}"


class SubscriptionPlanHistory(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    history_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='subscription_plan_history')
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='plan_history')

    previous_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_previous_plan'
    )
    new_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_new_plan'
    )

    previous_plan_name = models.CharField(max_length=100, blank=True, default='')
    new_plan_name = models.CharField(max_length=100, blank=True, default='')
    previous_plan_snapshot = models.JSONField(default=dict, blank=True)
    new_plan_snapshot = models.JSONField(default=dict, blank=True)

    previous_status = models.CharField(max_length=20, blank=True, default='')
    new_status = models.CharField(max_length=20, blank=True, default='')
    previous_billing_cycle = models.CharField(max_length=20, blank=True, default='')
    new_billing_cycle = models.CharField(max_length=20, blank=True, default='')

    reason = models.TextField(blank=True, null=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscription_plan_changes'
    )
    effective_date = models.DateField(default=timezone.now)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.tenant.name}: {self.previous_plan_name or 'None'} -> {self.new_plan_name or 'None'}"

class Invoice(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    invoice_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    status = models.CharField(max_length=20, choices=(('paid', 'Paid'), ('pending', 'Pending'), ('failed', 'Failed')), default='pending')
    issued_date = models.DateTimeField(auto_now_add=True)
    paid_date = models.DateTimeField(null=True, blank=True)
    pdf_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return f"INV-{str(self.invoice_id)[:8]} - {self.tenant.name}"

# ==========================================
# SCHOOL FINANCE MODELS (School Admin Level)
# ==========================================

class FeeStructure(SchemaScopedBillingModel, models.Model):
    """
    Defines the types of fees and their default amounts.
    """
    SCHEMA_SCOPE = "tenant"
    fee_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='fee_structures', db_constraint=False)
    name = models.CharField(max_length=100) # e.g., "Tuition Fee", "Exam Fee"
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Optional link to class. If null, applies generally or manually assigned.
    academic_class = models.ForeignKey('academic.AcademicClass', on_delete=models.SET_NULL, null=True, blank=True, related_name='fee_structures', db_constraint=False)
    frequency = models.CharField(max_length=20, choices=(
        ('monthly', 'Monthly'),
        ('one_time', 'One Time'),
        ('annual', 'Annual'),
        ('term', 'Term-wise')
    ), default='monthly')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.amount}"

class StudentFee(SchemaScopedBillingModel, models.Model):
    """
    Records a specific fee assigned to a student.
    """
    SCHEMA_SCOPE = "tenant"
    student_fee_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='student_fees', db_constraint=False)
    student = models.ForeignKey('academic.Student', on_delete=models.CASCADE, related_name='fees', db_constraint=False)
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name='assigned_fees', db_constraint=False)
    
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    due_date = models.DateField()
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('waived', 'Waived')
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.fee_structure.name} - {self.status}"

class Payment(SchemaScopedBillingModel, models.Model):
    """
    Records a payment transaction.
    """
    SCHEMA_SCOPE = "tenant"
    payment_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='payments', db_constraint=False)
    student = models.ForeignKey('academic.Student', on_delete=models.CASCADE, related_name='payments', db_constraint=False)
    # Optional link to specific fee if paying for one item. Often payments cover multiple fees.
    # For simplicity, we can link it, or just track balance. Let's link it optionaly.
    student_fee = models.ForeignKey(StudentFee, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments', db_constraint=False)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    
    METHOD_CHOICES = (
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('online', 'Online'),
        ('card', 'Card')
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    
    recorded_by = models.ForeignKey('users.UserAccount', on_delete=models.SET_NULL, null=True, related_name='recorded_payments', db_constraint=False)
    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.student} - {self.amount} - {self.payment_date}"

class Expense(SchemaScopedBillingModel, models.Model):
    """
    Records school operational expenses.
    """
    SCHEMA_SCOPE = "tenant"
    expense_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='expenses', db_constraint=False)
    
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    CATEGORY_CHOICES = (
        ('salary', 'Salary'),
        ('maintenance', 'Maintenance'),
        ('utilities', 'Utilities'),
        ('supplies', 'Supplies'),
        ('events', 'Events'),
        ('transport', 'Transport'),
        ('other', 'Other')
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    
    recorded_by = models.ForeignKey('users.UserAccount', on_delete=models.SET_NULL, null=True, related_name='recorded_expenses', db_constraint=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.amount}"


class BillingIdempotencyKey(SchemaScopedBillingModel, models.Model):
    """
    Stores idempotency state for billing write endpoints.
    """
    SCHEMA_SCOPE = "tenant"

    idempotency_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="billing_idempotency_keys",
        null=True,
        blank=True,
        db_constraint=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="billing_idempotency_keys",
        db_constraint=False,
    )
    endpoint = models.CharField(max_length=100)
    idempotency_key = models.CharField(max_length=255)
    request_fingerprint = models.CharField(max_length=64)
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    response_payload = models.JSONField(null=True, blank=True)
    resource_type = models.CharField(max_length=50, blank=True, default="")
    resource_id = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "endpoint", "idempotency_key"],
                name="billing_idempotency_user_endpoint_key_uniq",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "created_at"], name="bill_idem_tenant_c_idx"),
            models.Index(fields=["endpoint", "created_at"], name="bill_idem_ep_c_idx"),
        ]

    def __str__(self):
        return f"{self.endpoint}:{self.idempotency_key}"
    SCHEMA_SCOPE = "tenant"
    SCHEMA_SCOPE = "tenant"
    SCHEMA_SCOPE = "tenant"
    SCHEMA_SCOPE = "tenant"
    SCHEMA_SCOPE = "tenant"

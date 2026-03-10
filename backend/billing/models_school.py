import uuid
import uuid as uuid_lib

from django.conf import settings
from django.db import models

from core.models.tenant import Tenant

from .models_base import SchemaScopedBillingModel


class FeeDiscount(models.Model):
    """Reusable discount template (scholarship, sibling discount, staff child, etc.)"""
    discount_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'core.Tenant', on_delete=models.CASCADE,
        related_name='fee_discounts', db_constraint=False,
    )
    name = models.CharField(max_length=100)
    DISCOUNT_TYPES = [('percentage', 'Percentage'), ('flat', 'Flat Amount')]
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='percentage')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    max_cap = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                   help_text='Maximum discount cap (for percentage type)')
    reason = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        if self.discount_type == 'percentage':
            return f"{self.name} ({self.value}%)"
        return f"{self.name} (NPR {self.value})"

    def compute_discount(self, amount):
        """Return the actual discount amount for a given fee amount."""
        if self.discount_type == 'percentage':
            disc = amount * self.value / 100
            if self.max_cap:
                disc = min(disc, self.max_cap)
        else:
            disc = self.value
        return min(disc, amount)  # Can't discount more than the amount


class FeeStructure(SchemaScopedBillingModel, models.Model):
    """
    Defines the types of fees and their default amounts.
    """

    SCHEMA_SCOPE = "tenant"
    fee_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="fee_structures", db_constraint=False)
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    academic_class = models.ForeignKey(
        "academic.AcademicClass",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fee_structures",
        db_constraint=False,
    )
    frequency = models.CharField(
        max_length=20,
        choices=(
            ("monthly", "Monthly"),
            ("one_time", "One Time"),
            ("annual", "Annual"),
            ("term", "Term-wise"),
        ),
        default="monthly",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.amount}"


class StudentFee(SchemaScopedBillingModel, models.Model):
    """
    Records a specific fee assigned to a student.
    """

    SCHEMA_SCOPE = "tenant"
    student_fee_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="student_fees", db_constraint=False)
    student = models.ForeignKey("academic.Student", on_delete=models.CASCADE, related_name="fees", db_constraint=False)
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name="assigned_fees", db_constraint=False)

    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    due_date = models.DateField()

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("partial", "Partially Paid"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("waived", "Waived"),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    discount = models.ForeignKey(
        FeeDiscount, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='applied_fees', db_constraint=False,
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "status", "due_date"], name="bill_stfee_t_stat_due_idx"),
            models.Index(fields=["student", "status"], name="bill_stfee_student_stat_idx"),
        ]

    def __str__(self):
        return f"{self.student} - {self.fee_structure.name} - {self.status}"


class Payment(SchemaScopedBillingModel, models.Model):
    """
    Records a payment transaction.
    """

    SCHEMA_SCOPE = "tenant"
    payment_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payments", db_constraint=False)
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="payments",
        db_constraint=False,
    )
    student_fee = models.ForeignKey(
        StudentFee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        db_constraint=False,
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)

    METHOD_CHOICES = (
        ("cash", "Cash"),
        ("bank_transfer", "Bank Transfer"),
        ("cheque", "Cheque"),
        ("online", "Online"),
        ("card", "Card"),
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="cash")
    transaction_id = models.CharField(max_length=100, blank=True, null=True)

    recorded_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        related_name="recorded_payments",
        db_constraint=False,
    )
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "payment_date"], name="bill_pay_tenant_date_idx"),
            models.Index(fields=["student", "payment_date"], name="bill_pay_student_date_idx"),
        ]

    def __str__(self):
        return f"{self.student} - {self.amount} - {self.payment_date}"


class Expense(SchemaScopedBillingModel, models.Model):
    """
    Records school operational expenses.
    """

    SCHEMA_SCOPE = "tenant"
    expense_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="expenses", db_constraint=False)

    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    CATEGORY_CHOICES = (
        ("salary", "Salary"),
        ("maintenance", "Maintenance"),
        ("utilities", "Utilities"),
        ("supplies", "Supplies"),
        ("events", "Events"),
        ("transport", "Transport"),
        ("other", "Other"),
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")

    date = models.DateField()
    description = models.TextField(blank=True, null=True)

    recorded_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        related_name="recorded_expenses",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "date"], name="bill_exp_tenant_date_idx"),
            models.Index(fields=["tenant", "category", "date"], name="bill_exp_t_cat_d_idx"),
        ]

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

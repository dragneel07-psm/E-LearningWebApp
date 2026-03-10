"""Views for eSewa and Khalti payment gateway initiation and callbacks."""
import logging
import uuid as uuid_lib

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models_school import StudentFee, Payment
from billing_school.payment_gateways import EsewaGateway, KhaltiGateway

logger = logging.getLogger(__name__)


def _record_payment(fee, amount, method, gateway_ref, request):
    """Create a Payment record and update StudentFee status."""
    tenant = getattr(request.user, 'tenant', None) if request.user.is_authenticated else None
    recorded_by = request.user if request.user.is_authenticated else None

    payment = Payment.objects.create(
        tenant=tenant,
        student=fee.student,
        student_fee=fee,
        amount=amount,
        method=method,
        transaction_id=gateway_ref,
        recorded_by=recorded_by,
        remarks=f'Online payment via {method.upper()}',
    )
    fee.amount_paid = (fee.amount_paid or 0) + amount
    if fee.amount_paid >= fee.amount_due:
        fee.status = 'paid'
    else:
        fee.status = 'partial'
    fee.save()
    return payment


class EsewaInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fee_id = request.data.get('student_fee_id')
        if not fee_id:
            return Response({'error': 'student_fee_id is required.'}, status=400)
        try:
            fee = StudentFee.objects.get(pk=fee_id, tenant=request.user.tenant)
        except StudentFee.DoesNotExist:
            return Response({'error': 'Fee not found.'}, status=404)

        balance = float(fee.amount_due - (fee.amount_paid or 0))
        if balance <= 0:
            return Response({'error': 'No outstanding balance.'}, status=400)

        frontend_url = request.headers.get('Origin', 'http://localhost:3000')
        fields = EsewaGateway.build_form_fields(
            student_fee_id=str(fee_id),
            amount=balance,
            success_url=f"{frontend_url}/student/fees/payment-result?status=success&gateway=esewa",
            failure_url=f"{frontend_url}/student/fees/payment-result?status=failed&gateway=esewa",
        )
        return Response(fields)


class EsewaCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        oid = request.query_params.get('oid', '')
        amt = request.query_params.get('amt', '')
        ref_id = request.query_params.get('refId', '')

        if not all([oid, amt, ref_id]):
            return Response({'error': 'Missing parameters.'}, status=400)

        verified = EsewaGateway.verify_payment(oid, amt, ref_id)
        if not verified:
            return Response({'error': 'Payment verification failed.'}, status=400)

        # Extract fee ID from pid (format: sf_{fee_id_hex}_{random})
        try:
            fee_id_part = oid.split('_')[1]
            fee_id_with_dashes = (
                f"{fee_id_part[:8]}-{fee_id_part[8:12]}-{fee_id_part[12:16]}-"
                f"{fee_id_part[16:20]}-{fee_id_part[20:]}"
            )
            fee = StudentFee.objects.get(pk=fee_id_with_dashes)
        except Exception:
            logger.error("Could not find fee from oid: %s", oid)
            return Response({'error': 'Fee not found.'}, status=404)

        payment = _record_payment(fee, float(amt), 'esewa', ref_id, request)
        return Response({'status': 'success', 'payment_id': str(payment.pk)})


class KhaltiInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fee_id = request.data.get('student_fee_id')
        if not fee_id:
            return Response({'error': 'student_fee_id is required.'}, status=400)
        try:
            fee = StudentFee.objects.get(pk=fee_id, tenant=request.user.tenant)
        except StudentFee.DoesNotExist:
            return Response({'error': 'Fee not found.'}, status=404)

        balance = float(fee.amount_due - (fee.amount_paid or 0))
        if balance <= 0:
            return Response({'error': 'No outstanding balance.'}, status=400)

        frontend_url = request.headers.get('Origin', 'http://localhost:3000')
        return_url = f"{frontend_url}/student/fees/payment-result?gateway=khalti"
        fee_name = getattr(fee.fee_structure, 'name', 'School Fee') if hasattr(fee, 'fee_structure') else 'School Fee'
        user = request.user
        customer_name = f"{user.first_name} {user.last_name}".strip() or 'Student'

        try:
            result = KhaltiGateway.initiate(
                amount_paisa=int(balance * 100),
                purchase_order_id=str(fee_id),
                return_url=return_url,
                purchase_order_name=fee_name,
                customer_name=customer_name,
                customer_phone=getattr(user, 'phone_number', ''),
            )
        except Exception as exc:
            logger.error("Khalti initiation error: %s", exc)
            return Response({'error': 'Payment initiation failed.'}, status=500)

        return Response({
            'pidx': result.get('pidx'),
            'payment_url': result.get('payment_url'),
            'expires_at': result.get('expires_at'),
        })


class KhaltiCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        pidx = request.query_params.get('pidx')
        if not pidx:
            return Response({'error': 'pidx required.'}, status=400)

        try:
            result = KhaltiGateway.verify(pidx)
        except Exception as exc:
            logger.error("Khalti verification error: %s", exc)
            return Response({'error': 'Verification failed.'}, status=400)

        if result.get('status') != 'Completed':
            return Response({'error': f"Payment not completed. Status: {result.get('status')}"}, status=400)

        purchase_order_id = result.get('purchase_order_id')
        total_amount_paisa = result.get('total_amount', 0)
        amount_npr = total_amount_paisa / 100

        try:
            fee = StudentFee.objects.get(pk=purchase_order_id)
        except StudentFee.DoesNotExist:
            return Response({'error': 'Fee not found.'}, status=404)

        payment = _record_payment(fee, amount_npr, 'khalti', pidx, request)
        return Response({'status': 'success', 'payment_id': str(payment.pk)})

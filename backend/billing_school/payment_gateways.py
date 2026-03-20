# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Nepal payment gateway integrations: eSewa and Khalti."""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class EsewaGateway:
    """eSewa payment integration (form-redirect model)."""

    @staticmethod
    def get_merchant_code():
        return getattr(settings, 'ESEWA_MERCHANT_CODE', 'EPAYTEST')

    @staticmethod
    def get_payment_url():
        return getattr(settings, 'ESEWA_PAYMENT_URL', 'https://uat.esewa.com.np/epay/main')

    @staticmethod
    def get_verify_url():
        return getattr(settings, 'ESEWA_VERIFY_URL', 'https://uat.esewa.com.np/epay/transrec')

    @staticmethod
    def build_form_fields(student_fee_id: str, amount: float, success_url: str, failure_url: str) -> dict:
        """Build the hidden form fields for eSewa redirect."""
        import uuid
        pid = f"sf_{student_fee_id.replace('-', '')[:16]}_{uuid.uuid4().hex[:6]}"
        return {
            'amt': str(amount),
            'txAmt': '0',
            'psc': '0',
            'pdc': '0',
            'scd': EsewaGateway.get_merchant_code(),
            'pid': pid,
            'su': success_url,
            'fu': failure_url,
            '_payment_url': EsewaGateway.get_payment_url(),
        }

    @staticmethod
    def verify_payment(oid: str, amt: str, ref_id: str) -> bool:
        """Verify eSewa payment by calling eSewa's verification endpoint."""
        try:
            resp = requests.post(EsewaGateway.get_verify_url(), data={
                'amt': amt,
                'rid': ref_id,
                'pid': oid,
                'scd': EsewaGateway.get_merchant_code(),
            }, timeout=15)
            if '<response_code>Success</response_code>' in resp.text:
                return True
            logger.warning("eSewa verification failed: %s", resp.text[:200])
            return False
        except Exception as exc:
            logger.error("eSewa verification error: %s", exc)
            return False


class KhaltiGateway:
    """Khalti payment integration (REST initiation + verification model)."""

    INITIATE_URL = 'https://a.khalti.com/api/v2/epayment/initiate/'
    LOOKUP_URL = 'https://a.khalti.com/api/v2/epayment/lookup/'

    @staticmethod
    def get_secret_key():
        return getattr(settings, 'KHALTI_SECRET_KEY', '')

    @staticmethod
    def _headers():
        return {
            'Authorization': f'Key {KhaltiGateway.get_secret_key()}',
            'Content-Type': 'application/json',
        }

    @staticmethod
    def initiate(amount_paisa: int, purchase_order_id: str, return_url: str,
                  purchase_order_name: str, customer_name: str = '', customer_phone: str = '') -> dict:
        """Initiate a Khalti payment. Returns {'pidx': ..., 'payment_url': ...} or raises."""
        payload = {
            'return_url': return_url,
            'website_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
            'amount': amount_paisa,
            'purchase_order_id': purchase_order_id,
            'purchase_order_name': purchase_order_name,
            'customer_info': {
                'name': customer_name or 'Student',
                'phone': customer_phone or '9800000000',
            },
        }
        resp = requests.post(
            KhaltiGateway.INITIATE_URL,
            json=payload,
            headers=KhaltiGateway._headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()  # {'pidx': '...', 'payment_url': '...', 'expires_at': '...'}

    @staticmethod
    def verify(pidx: str) -> dict:
        """Lookup/verify a Khalti payment by pidx. Returns full status dict."""
        resp = requests.post(
            KhaltiGateway.LOOKUP_URL,
            json={'pidx': pidx},
            headers=KhaltiGateway._headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()  # {'pidx': '...', 'status': 'Completed', 'total_amount': ...}

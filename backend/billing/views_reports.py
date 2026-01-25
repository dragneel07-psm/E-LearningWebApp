from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from .models import Payment
from core.reports import generate_pdf_response, generate_excel_response

class BillingReportViewSet(viewsets.ViewSet):
    """
    ViewSet for generating billing and finance reports.
    """
    
    @action(detail=False, methods=['get'], url_path='fee-collection')
    def fee_collection_pdf(self, request):
        # Optional date filtering could be added here
        payments = Payment.objects.all().select_related('student', 'student_fee__fee_structure').order_by('-payment_date')
        
        total_amount = payments.aggregate(total=Sum('amount'))['total'] or 0
        
        # Add fee_name for template convenience
        for p in payments:
            p.fee_name = p.student_fee.fee_structure.name if p.student_fee else "General Payment"
            
        context = {
            'payments': payments,
            'total_amount': total_amount,
            'transaction_count': payments.count(),
            'currency': 'USD', # Should be dynamic from settings/plan
            'school_name': request.headers.get('x-tenant-id', 'Our School').capitalize(),
            'date': timezone.now().strftime("%B %d, %Y"),
            'start_date': "All Time",
            'end_date': timezone.now().strftime("%Y-%m-%d")
        }
        
        filename = f"fee_collection_report_{timezone.now().strftime('%Y%m%d')}.pdf"
        response = generate_pdf_response('reports/fee_collection.html', context, filename)
        
        if response:
            return response
        return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='fee-collection-excel')
    def fee_collection_excel(self, request):
        payments = Payment.objects.all().select_related('student', 'student_fee__fee_structure').order_by('-payment_date')
        
        data = []
        for p in payments:
            data.append({
                'Date': p.payment_date.strftime("%Y-%m-%d"),
                'Student': f"{p.student.first_name} {p.student.last_name}",
                'Fee Type': p.student_fee.fee_structure.name if p.student_fee else "General Payment",
                'Method': p.get_method_display(),
                'Transaction ID': p.transaction_id or 'N/A',
                'Amount': float(p.amount)
            })
            
        columns = ['Date', 'Student', 'Fee Type', 'Method', 'Transaction ID', 'Amount']
        filename = f"fee_collection_report_{timezone.now().strftime('%Y%m%d')}.xlsx"
        
        return generate_excel_response(data, columns, filename)

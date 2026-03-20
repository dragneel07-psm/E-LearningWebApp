# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import io
import logging
from django.http import HttpResponse
from django.template.loader import render_to_string
from xhtml2pdf import pisa
# import pandas as pd (Moved to lazy import)

logger = logging.getLogger(__name__)


def generate_pdf_response(template_path, context, filename):
    """
    Generates a PDF response from an HTML template.
    """
    try:
        html = render_to_string(template_path, context)
    except Exception:
        logger.exception("Failed to render report template %s", template_path)
        return None

    result = io.BytesIO()
    try:
        pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)
    except Exception:
        pdf = None
        logger.exception("PDF conversion crashed for template %s", template_path)

    if pdf and not pdf.err:
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    if pdf and pdf.err:
        logger.warning("PDF conversion returned parser errors for template %s", template_path)

    # Fallback: keep report downloadable even when PDF rendering fails in runtime env.
    fallback_html = (
        "<html><body>"
        "<h2>Report Fallback</h2>"
        "<p>The formatted PDF could not be generated in this environment.</p>"
        "<p>Please contact support if this continues.</p>"
        "</body></html>"
    )
    fallback_result = io.BytesIO()
    try:
        fallback_pdf = pisa.pisaDocument(io.BytesIO(fallback_html.encode("UTF-8")), fallback_result)
    except Exception:
        fallback_pdf = None
        logger.exception("Fallback PDF conversion crashed for template %s", template_path)

    if fallback_pdf and not fallback_pdf.err:
        response = HttpResponse(fallback_result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-Report-Fallback'] = '1'
        return response

    logger.warning("Serving HTML fallback for report template %s after PDF failures", template_path)
    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename.rsplit(".", 1)[0]}.html"'
    response['X-Report-Fallback'] = 'html'
    return response

def generate_excel_response(data, columns, filename):
    """
    Generates an Excel response from a list of dictionaries.
    """
    import pandas as pd
    df = pd.DataFrame(data, columns=columns)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

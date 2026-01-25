import io
from django.http import HttpResponse
from django.template.loader import render_to_string
from xhtml2pdf import pisa
# import pandas as pd (Moved to lazy import)

def generate_pdf_response(template_path, context, filename):
    """
    Generates a PDF response from an HTML template.
    """
    html = render_to_string(template_path, context)
    result = io.BytesIO()
    pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)
    
    if not pdf.err:
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    return None

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

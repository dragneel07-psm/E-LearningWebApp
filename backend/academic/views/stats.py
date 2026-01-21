from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Teacher, Student, AcademicClass, Subject

class AcademicStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats = {
            'total_teachers': Teacher.objects.count(),
            'total_students': Student.objects.count(),
            'total_classes': AcademicClass.objects.count(),
            'total_subjects': Subject.objects.count(),
        }
        return Response(stats)

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from ..models import AcademicYear, AcademicClass, Section, Subject
from ..serializers import AcademicYearSerializer, AcademicClassSerializer, SectionSerializer, SubjectSerializer

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

class AcademicClassViewSet(viewsets.ModelViewSet):
    # Prefetch related sections and subjects for performance
    queryset = AcademicClass.objects.prefetch_related('sections', 'subjects').all()
    serializer_class = AcademicClassSerializer
    permission_classes = [IsAuthenticated]

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related('academic_class').all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

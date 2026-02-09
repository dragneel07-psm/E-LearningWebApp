from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from academic.models import Exam, ExamSeating, Student, Assessment
from academic.serializers.exam import ExamSerializer, ExamSeatingSerializer
from academic.services.exam_service import ExamService
from django.core.exceptions import ValidationError

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Exam.objects.none()
            
        if hasattr(user, 'role'):
            if user.role == 'student':
                try:
                    student = Student.objects.get(user=user)
                    # Students only see exams for their class
                    return Exam.objects.filter(assessment__section__academic_class=student.academic_class, is_published=True)
                except Student.DoesNotExist:
                    return Exam.objects.none()
            elif user.role == 'school_admin':
                 # Admins see all exams for their school (tenant filtering handled by multi-tenant logic)
                return Exam.objects.all()
        
        return Exam.objects.all() # Default to all for teachers/admins

    @action(detail=True, methods=['post'])
    def allocate_seating(self, request, pk=None):
        """Triggers the automated seating allocation logic via ExamService"""
        try:
            count = ExamService.allocate_seating(pk)
            return Response({
                "message": f"Successfully allocated seating for {count} students.",
                "count": count
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Allocation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publishes the exam, making it visible to students and triggering notifications"""
        if ExamService.publish_exam(pk):
            return Response({"message": "Exam published successfully."}, status=status.HTTP_200_OK)
        return Response({"message": "Exam is already published."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def generate_hall_tickets(self, request, pk=None):
        """Legacy alias for allocate_seating (for backward compatibility)"""
        return self.allocate_seating(request, pk)

class ExamSeatingViewSet(viewsets.ModelViewSet):
    queryset = ExamSeating.objects.all()
    serializer_class = ExamSeatingSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ExamSeating.objects.none()
            
        if hasattr(user, 'role') and user.role == 'student':
            try:
                student = Student.objects.get(user=user)
                return ExamSeating.objects.filter(student=student)
            except Student.DoesNotExist:
                return ExamSeating.objects.none()
                
        return ExamSeating.objects.all()

import json
from typing import Dict, List
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count
from academic.models import Student, Result, Attendance, LessonProgress, Subject
from ..services.tutor_service import AITutorService
from ..models import StudentAIReport

class ReportingService:
    def __init__(self):
        self.tutor_service = AITutorService()

    def generate_student_report(self, student_id: str, save: bool = True, is_automated: bool = False) -> Dict:
        """
        Generate a comprehensive AI-driven performance report for a student.
        """
        try:
            student = Student.objects.select_related('user', 'academic_class', 'section').get(student_id=student_id)
            
            # 1. Gather Performance Data
            results = Result.objects.filter(student=student).select_related('assessment', 'assessment__subject').order_by('-submitted_at')
            avg_score = results.aggregate(Avg('score'))['score__avg'] or 0
            
            # 2. Topic Mastery
            subjects = Subject.objects.filter(academic_class=student.academic_class)
            mastery_data = []
            for sub in subjects:
                sub_results = results.filter(assessment__subject=sub)
                if sub_results.exists():
                    total_p = sum((r.score / r.assessment.total_marks) * 100 for r in sub_results) / sub_results.count()
                    mastery_data.append({
                        'subject': sub.name,
                        'score': round(total_p, 1)
                    })

            # 3. Attendance
            thirty_days_ago = timezone.now() - timedelta(days=30)
            att_records = Attendance.objects.filter(student=student, date__gte=thirty_days_ago)
            att_rate = 0
            if att_records.exists():
                att_rate = (att_records.filter(status='present').count() / att_records.count()) * 100

            # 4. Learning Habits
            streak = getattr(student, 'current_streak', 0)
            focus = getattr(student, 'focus_score', 0)
            
            # 5. Generate AI Summary using Tutor Service (or a specialized prompt)
            report_context = {
                'name': student.user.get_full_name(),
                'class': student.academic_class.name if student.academic_class else "N/A",
                'avg_score': avg_score,
                'mastery': mastery_data,
                'attendance': att_rate,
                'streak': streak,
                'focus': focus
            }
            
            prompt = f"""
            Generate a formal academic progress report for {report_context['name']} (Class: {report_context['class']}).
            Current Metrics:
            - Average Quiz/Exam Score: {report_context['avg_score']}%
            - Attendance Rate (Last 30 days): {report_context['attendance']}%
            - Topic Mastery: {', '.join([f"{m['subject']}: {m['score']}%" for m in report_context['mastery']])}
            - Learning Consistency: {report_context['streak']} day streak, {report_context['focus']}% focus score.

            Please provide:
            1. An executive summary of performance.
            2. Strengths identified.
            3. Areas for improvement.
            4. Advice for parents/teachers to support the student.
            Format the response as JSON with keys: 'summary', 'strengths', 'weaknesses', 'recommendations'.
            """
            
            # For now, if no API key, use mock summary
            response = self.tutor_service.get_chat_response([{"role": "user", "content": prompt}])
            
            # Try to parse JSON if AI returned it, otherwise fallback
            try:
                ai_data = json.loads(response)
            except:
                ai_data = {
                    "summary": f"{student.user.first_name} is showing steady progress in {report_context['class']}. Their average score is {round(avg_score)}%.",
                    "strengths": ["Active participation", "Consistent study habits"],
                    "weaknesses": ["Attendance could be improved", "Focus on advanced topics"],
                    "recommendations": ["Encourage daily practice", "Review weak subjects weekly"]
                }

            report_obj = {
                "student_name": report_context['name'],
                "metrics": report_context,
                "ai_report": ai_data,
                "generated_at": timezone.now().isoformat()
            }

            if save:
                StudentAIReport.objects.create(
                    tenant_id=student.user.tenant_id,
                    student=student,
                    report_data=report_obj,
                    is_automated=is_automated
                )

            return report_obj

        except Exception as e:
            print(f"Reporting Error: {e}")
            return {"error": str(e)}

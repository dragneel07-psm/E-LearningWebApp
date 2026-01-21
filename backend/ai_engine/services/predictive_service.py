from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count
from academic.models.student import Student
from academic.models.assessment import Assessment, Result
from academic.models.attendance import Attendance
from academic.models.subject import Subject

class PredictiveAnalyticsService:
    def get_teacher_dashboard_data(self, class_ids):
        """
        Generate predictive analytics for a list of academic class IDs.
        """
        try:
            if not class_ids:
                return {
                    "at_risk_count": 0,
                    "at_risk_students": [],
                    "performance_trends": [],
                    "topic_mastery": [],
                    "ai_insights": ["You haven't been assigned any classes yet."]
                }

            # 1. Identify Students at Risk
            risk_students = self._identify_at_risk_students(class_ids)
            
            # 2. Performance Trends (Last 4 weeks)
            trends = self._calculate_performance_trends(class_ids)
            
            # 3. Topic Mastery Predictions
            topic_mastery = self._calculate_topic_mastery(class_ids)

            return {
                "at_risk_count": len(risk_students),
                "at_risk_students": risk_students[:5], # Top 5 highest risk
                "performance_trends": trends,
                "topic_mastery": topic_mastery,
                "ai_insights": self._generate_ai_insights(risk_students, topic_mastery)
            }
        except Exception as e:
            print(f"Predictive Analytics Error: {e}")
            return {"error": str(e)}

    def get_teacher_analytics(self, teacher_user):
        """
        Generate predictive analytics for a teacher's assigned classes.
        """
        from academic.models.teacher import Teacher
        try:
            teacher = Teacher.objects.get(user=teacher_user)
            assigned_classes = teacher.assigned_classes or []
            
            if not assigned_classes:
                return {"error": "No classes assigned to this teacher"}

            # 1. Identify Students at Risk
            risk_students = self._identify_at_risk_students(assigned_classes)
            
            # 2. Performance Trends (Last 4 weeks)
            trends = self._calculate_performance_trends(assigned_classes)
            
            # 3. Topic Mastery Predictions
            topic_mastery = self._calculate_topic_mastery(assigned_classes)

            return {
                "at_risk_count": len(risk_students),
                "at_risk_students": risk_students[:5], # Top 5 highest risk
                "performance_trends": trends,
                "topic_mastery": topic_mastery,
                "ai_insights": self._generate_ai_insights(risk_students, topic_mastery)
            }
        except Exception as e:
            print(f"Predictive Analytics Error: {e}")
            return {"error": str(e)}

    def _identify_at_risk_students(self, class_ids):
        """
        Identify students with low grades or declining attendance.
        """
        risk_list = []
        students = Student.objects.filter(academic_class_id__in=class_ids)
        
        for student in students:
            reasons = []
            risk_score = 0
            
            # Check Grades (avg < 50%)
            avg_score = Result.objects.filter(student=student).aggregate(Avg('score'))['score__avg']
            # Note: total marks vary, so this is a simplified check. Ideally use percentage.
            # For simplicity, let's assume total_marks=100 in this calculation or fetch actual ratio.
            
            results = Result.objects.filter(student=student).select_related('assessment')
            if results.exists():
                total_percentage = sum((r.score / r.assessment.total_marks) * 100 for r in results) / results.count()
                if total_percentage < 55:
                    risk_score += 40
                    reasons.append(f"Low average grade ({round(total_percentage)}%)")
            
            # Check Attendance (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            attendance = Attendance.objects.filter(student=student, date__gte=thirty_days_ago)
            if attendance.exists():
                present_count = attendance.filter(status='present').count()
                total_days = attendance.count()
                att_percentage = (present_count / total_days) * 100
                if att_percentage < 75:
                    risk_score += 30
                    reasons.append(f"Low attendance ({round(att_percentage)}%)")

            if risk_score > 0:
                risk_list.append({
                    "id": student.student_id,
                    "name": student.user.get_full_name(),
                    "risk_level": "High" if risk_score >= 60 else "Medium",
                    "reasons": reasons,
                    "score": risk_score
                })
        
        return sorted(risk_list, key=lambda x: x['score'], reverse=True)

    def _calculate_performance_trends(self, class_ids):
        """
        Weekly performance trends.
        """
        weeks = []
        now = timezone.now()
        for i in range(4, -1, -1):
            start_date = now - timedelta(weeks=i+1)
            end_date = now - timedelta(weeks=i)
            
            avg = Result.objects.filter(
                assessment__subject__academic_class_id__in=class_ids,
                submitted_at__range=(start_date, end_date)
            ).select_related('assessment')
            
            if avg.exists():
                # Percentages
                p_avg = sum((r.score / r.assessment.total_marks) * 100 for r in avg) / avg.count()
                weeks.append({
                    "week": f"Week {5-i}",
                    "avgScore": round(p_avg),
                    "classAvg": 70 # Standard/Target
                })
            else:
                weeks.append({
                    "week": f"Week {5-i}",
                    "avgScore": 0,
                    "classAvg": 70
                })
        return weeks

    def _calculate_topic_mastery(self, class_ids):
        """
        Mastery level by subject.
        """
        subjects = Subject.objects.filter(academic_class_id__in=class_ids)
        mastery = []
        for sub in subjects:
            results = Result.objects.filter(assessment__subject=sub).select_related('assessment')
            if results.exists():
                avg_p = sum((r.score / r.assessment.total_marks) * 100 for r in results) / results.count()
                mastery.append({
                    "topic": sub.name,
                    "score": round(avg_p)
                })
        return mastery

    def _generate_ai_insights(self, risk_students, topic_mastery):
        """
        Generate text insights based on data.
        """
        insights = []
        if risk_students:
            insights.append(f"Action required: {len(risk_students)} students are showing signs of academic risk. Priority focus on {risk_students[0]['name']}.")
        
        weak_topics = [t['topic'] for t in topic_mastery if t['score'] < 65]
        if weak_topics:
            insights.append(f"Curriculum Alert: Class performance is below benchmarks in {', '.join(weak_topics)}. Potential need for supplementary materials.")
        else:
            insights.append("Curriculum Progress: All topics are currently meeting mastery benchmarks.")
            
        return insights

predictive_service = PredictiveAnalyticsService()

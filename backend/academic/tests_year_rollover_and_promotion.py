from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import (
    AcademicClass,
    AcademicYear,
    Assessment,
    Chapter,
    Lesson,
    LessonMaterial,
    Result,
    Section,
    Student,
    Subject,
    Timetable,
)
from academic.models.question import Question

User = get_user_model()


class AcademicYearRolloverAndPromotionTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Rollover Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.admin_user = User.objects.create_user(
            username="rollover_admin",
            email="rollover_admin@example.com",
            password="Admin@1234",
            role="admin",
            first_name="Rollover",
            last_name="Admin",
            tenant=self.tenant,
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_rollover_migrates_selected_data_and_promotes_students(self):
        source_year = AcademicYear.objects.create(
            name="2091-2092",
            start_date="2025-04-01",
            end_date="2026-03-31",
            is_current=True,
        )
        class_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        class_9 = AcademicClass.objects.create(name="Grade 9", order=9)
        section_8a = Section.objects.create(name="A", academic_class=class_8)
        section_9a = Section.objects.create(name="A", academic_class=class_9)

        student_user = User.objects.create_user(
            username="rollover_student",
            email="rollover_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        student = Student.objects.create(
            user=student_user,
            academic_class=class_8,
            section=section_8a,
        )

        subject = Subject.objects.create(
            name="Mathematics",
            code="MATH-8",
            academic_class=class_8,
            academic_year=source_year,
            is_active=True,
        )
        assessment = Assessment.objects.create(
            academic_year=source_year,
            subject=subject,
            section=section_8a,
            title="Final Term Math",
            type="exam",
            total_marks=100,
            passing_marks=40,
            is_final_assessment=True,
        )
        Question.objects.create(
            assessment=assessment,
            text="2 + 2 = ?",
            type="mcq",
            options=["2", "3", "4", "5"],
            correct_answer="4",
            points=1,
            order=1,
        )
        chapter = Chapter.objects.create(
            subject=subject,
            title="Numbers",
            order=1,
            is_published=True,
        )
        lesson = Lesson.objects.create(
            chapter=chapter,
            title="Whole Numbers",
            content_type="text",
            content="Intro lesson",
            order=1,
            is_published=True,
            assessment=assessment,
            duration_minutes=40,
        )
        LessonMaterial.objects.create(
            lesson=lesson,
            title="Worksheet",
            material_type="link",
            link="https://example.com/worksheet",
        )
        Timetable.objects.create(
            academic_year=source_year,
            academic_class=class_8,
            day_of_week="Monday",
            start_time="09:00",
            end_time="10:00",
            subject_name="Mathematics",
            entry_type="main",
        )

        payload = {
            "source_year": source_year.id,
            "target": {
                "name": "2092-2093",
                "start_date": "2026-04-01",
                "end_date": "2027-03-31",
            },
            "options": {
                "migrate_timetable": True,
                "migrate_courses": True,
                "migrate_lessons": True,
                "migrate_quizzes": True,
                "auto_upgrade_students": True,
            },
        }
        response = self.client.post("/api/academic/years/rollover/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target_year = AcademicYear.objects.get(name="2092-2093")
        self.assertTrue(target_year.is_current)

        self.assertTrue(
            Subject.objects.filter(
                name="Mathematics",
                academic_class=class_8,
                academic_year=target_year,
            ).exists()
        )
        target_subject = Subject.objects.get(
            name="Mathematics",
            academic_class=class_8,
            academic_year=target_year,
        )
        self.assertTrue(Chapter.objects.filter(subject=target_subject, title="Numbers").exists())
        target_chapter = Chapter.objects.get(subject=target_subject, title="Numbers")
        self.assertTrue(Lesson.objects.filter(chapter=target_chapter, title="Whole Numbers").exists())
        target_lesson = Lesson.objects.get(chapter=target_chapter, title="Whole Numbers")
        self.assertTrue(LessonMaterial.objects.filter(lesson=target_lesson, title="Worksheet").exists())
        self.assertTrue(
            Assessment.objects.filter(
                academic_year=target_year,
                subject=target_subject,
                title="Final Term Math",
            ).exists()
        )
        self.assertTrue(
            Timetable.objects.filter(
                academic_year=target_year,
                academic_class=class_8,
                day_of_week="Monday",
                start_time="09:00",
            ).exists()
        )

        student.refresh_from_db()
        self.assertEqual(student.academic_class_id, class_9.id)
        self.assertEqual(student.section_id, section_9a.id)

        summary = response.data.get("summary", {})
        self.assertGreaterEqual(summary.get("subjects_migrated", 0), 1)
        self.assertGreaterEqual(summary.get("lessons_migrated", 0), 1)
        self.assertGreaterEqual(summary.get("assessments_migrated", 0), 1)
        self.assertGreaterEqual(summary.get("students_promoted", 0), 1)

    def test_publish_final_results_promotes_only_target_assessment_scope(self):
        year = AcademicYear.objects.create(
            name="2081-2082",
            start_date="2024-04-01",
            end_date="2025-03-31",
            is_current=True,
        )
        class_7 = AcademicClass.objects.create(name="Grade 7", order=7)
        class_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        class_9 = AcademicClass.objects.create(name="Grade 9", order=9)
        section_7a = Section.objects.create(name="A", academic_class=class_7)
        section_8a = Section.objects.create(name="A", academic_class=class_8)
        Section.objects.create(name="A", academic_class=class_9)

        promoted_user = User.objects.create_user(
            username="promotion_target",
            email="promotion_target@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        promoted_student = Student.objects.create(
            user=promoted_user,
            academic_class=class_7,
            section=section_7a,
        )

        unaffected_user = User.objects.create_user(
            username="promotion_other",
            email="promotion_other@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        unaffected_student = Student.objects.create(
            user=unaffected_user,
            academic_class=class_8,
            section=section_8a,
        )

        subject = Subject.objects.create(
            name="Science",
            code="SCI-7",
            academic_class=class_7,
            academic_year=year,
            is_active=True,
        )
        assessment = Assessment.objects.create(
            academic_year=year,
            subject=subject,
            section=section_7a,
            title="Grade 7 Final Science",
            type="exam",
            total_marks=100,
            passing_marks=40,
            is_final_assessment=True,
        )
        Result.objects.create(assessment=assessment, student=promoted_student, score=85, time_taken_minutes=45)

        response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/publish_results/?academic_year={year.id}",
            {"publish": True, "auto_upgrade_students": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assessment.refresh_from_db()
        promoted_student.refresh_from_db()
        unaffected_student.refresh_from_db()

        self.assertTrue(assessment.results_published)
        self.assertTrue(response.data.get("student_promotion"))
        self.assertEqual(response.data["student_promotion"]["promoted_students"], 1)
        self.assertEqual(promoted_student.academic_class_id, class_8.id)
        self.assertEqual(unaffected_student.academic_class_id, class_8.id)

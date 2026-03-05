from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Dict, Optional

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from academic.models import (
    AcademicClass,
    AcademicYear,
    Assessment,
    Attendance,
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


@dataclass
class PromotionRules:
    min_score_percentage: Optional[float] = None
    min_attendance_percentage: Optional[float] = None
    manual_promote_student_ids: tuple[str, ...] = ()
    manual_hold_student_ids: tuple[str, ...] = ()

    @classmethod
    def from_payload(cls, payload: Optional[object]) -> "PromotionRules":
        if not isinstance(payload, dict):
            return cls()

        def _to_optional_percent(value: object) -> Optional[float]:
            if value is None:
                return None
            if isinstance(value, str):
                raw = value.strip()
                if raw == "":
                    return None
                value = raw
            try:
                parsed = float(value)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                return None
            if parsed < 0:
                parsed = 0.0
            if parsed > 100:
                parsed = 100.0
            return parsed

        def _to_student_ids(value: object) -> tuple[str, ...]:
            if value is None:
                return ()
            if isinstance(value, str):
                parts = [item.strip() for item in value.split(",")]
            elif isinstance(value, (list, tuple, set)):
                parts = [str(item).strip() for item in value]
            else:
                return ()

            cleaned = []
            seen = set()
            for item in parts:
                if not item:
                    continue
                key = item.lower()
                if key in seen:
                    continue
                seen.add(key)
                cleaned.append(item)
            return tuple(cleaned)

        return cls(
            min_score_percentage=_to_optional_percent(payload.get("min_score_percentage")),
            min_attendance_percentage=_to_optional_percent(payload.get("min_attendance_percentage")),
            manual_promote_student_ids=_to_student_ids(payload.get("manual_promote_student_ids")),
            manual_hold_student_ids=_to_student_ids(payload.get("manual_hold_student_ids")),
        )


@dataclass
class YearRolloverOptions:
    migrate_subjects: bool = True
    migrate_lessons: bool = True
    migrate_assessments: bool = True
    migrate_timetable: bool = True
    auto_upgrade_students: bool = False
    promotion_rules: PromotionRules = field(default_factory=PromotionRules)


def _to_date(value: Optional[object]) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return None


def _set_current_year(year: AcademicYear) -> AcademicYear:
    with transaction.atomic():
        AcademicYear.objects.exclude(pk=year.pk).update(is_current=False)
        if not year.is_current:
            year.is_current = True
            year.save(update_fields=["is_current", "updated_at"])
    _sync_tenant_current_academic_year(year)
    return year


def _sync_tenant_current_academic_year(year: AcademicYear) -> None:
    """
    Keep shared Tenant.current_academic_year aligned with tenant-schema AcademicYear.
    """
    try:
        from core.models import Tenant

        schema_name = getattr(connection, "schema_name", None)
        if not schema_name:
            return
        Tenant.objects.filter(schema_name=schema_name).update(current_academic_year=year.name)
    except Exception:
        # Best-effort sync only.
        return


def _default_cycle_for_day(today: date) -> tuple[date, date]:
    """
    School cycle heuristic: Apr 1 -> Mar 31.
    """
    if (today.month, today.day) >= (4, 1):
        start_year = today.year
    else:
        start_year = today.year - 1
    start = date(start_year, 4, 1)
    end = date(start_year + 1, 3, 31)
    return start, end


def create_next_academic_year(source_year: Optional[AcademicYear] = None, *, name: Optional[str] = None,
                              start_date: Optional[date] = None, end_date: Optional[date] = None) -> AcademicYear:
    if source_year is None:
        source_year = AcademicYear.objects.order_by("-end_date").first()

    start = start_date
    end = end_date

    if source_year:
        if start is None:
            start = source_year.end_date + timedelta(days=1)
        if end is None:
            cycle_days = max(1, (source_year.end_date - source_year.start_date).days)
            end = start + timedelta(days=cycle_days)

    if start is None or end is None:
        today = timezone.localdate()
        start, end = _default_cycle_for_day(today)

    year_name = name or f"{start.year}-{end.year}"
    next_year, _ = AcademicYear.objects.get_or_create(
        name=year_name,
        defaults={
            "start_date": start,
            "end_date": end,
            "is_current": False,
        },
    )
    return next_year


def ensure_current_academic_year(today: Optional[date] = None) -> Optional[AcademicYear]:
    today = today or timezone.localdate()

    current = AcademicYear.objects.filter(is_current=True).order_by("-start_date").first()
    if current and current.start_date <= today <= current.end_date:
        _sync_tenant_current_academic_year(current)
        return current

    active_for_day = AcademicYear.objects.filter(
        start_date__lte=today,
        end_date__gte=today,
    ).order_by("-start_date").first()
    if active_for_day:
        return _set_current_year(active_for_day)

    anchor = current or AcademicYear.objects.order_by("-end_date").first()
    if anchor and anchor.end_date < today:
        next_year = create_next_academic_year(anchor)
        return _set_current_year(next_year)

    if not anchor:
        start, end = _default_cycle_for_day(today)
        created_year, _ = AcademicYear.objects.get_or_create(
            name=f"{start.year}-{end.year}",
            defaults={"start_date": start, "end_date": end, "is_current": True},
        )
        return _set_current_year(created_year)

    # Fallback to most recent year if today is before all known ranges.
    return _set_current_year(anchor)


def get_current_academic_year() -> Optional[AcademicYear]:
    return ensure_current_academic_year()


def promote_students_to_next_class(
    *,
    academic_class: Optional[AcademicClass] = None,
    section: Optional[Section] = None,
    academic_year: Optional[AcademicYear] = None,
    rules: Optional[PromotionRules] = None,
) -> Dict[str, int]:
    classes = list(AcademicClass.objects.order_by("order", "id"))
    if not classes:
        return {
            "promoted_students": 0,
            "skipped_students": 0,
            "failed_score": 0,
            "failed_attendance": 0,
            "manual_promoted": 0,
            "manual_held": 0,
            "insufficient_data": 0,
        }

    class_index = {cls.id: idx for idx, cls in enumerate(classes)}
    promoted = 0
    skipped = 0
    failed_score = 0
    failed_attendance = 0
    manual_promoted = 0
    manual_held = 0
    insufficient_data = 0

    rules = rules or PromotionRules()
    manual_promote_ids = {value.lower() for value in rules.manual_promote_student_ids}
    manual_hold_ids = {value.lower() for value in rules.manual_hold_student_ids}

    students_qs = Student.objects.select_related("academic_class", "section")
    if section is not None:
        students_qs = students_qs.filter(section=section)
    elif academic_class is not None:
        students_qs = students_qs.filter(academic_class=academic_class)

    for student in students_qs:
        student_id_text = str(student.student_id).lower()

        if student_id_text in manual_hold_ids:
            manual_held += 1
            skipped += 1
            continue

        if not student.academic_class_id or student.academic_class_id not in class_index:
            skipped += 1
            continue

        if student_id_text not in manual_promote_ids:
            if rules.min_score_percentage is not None:
                result_qs = Result.objects.filter(
                    student=student,
                    assessment__is_final_assessment=True,
                    assessment__results_published=True,
                    assessment__subject__academic_class=student.academic_class,
                ).select_related("assessment")

                if academic_year is not None:
                    result_qs = result_qs.filter(assessment__academic_year=academic_year)

                if student.section_id:
                    result_qs = result_qs.filter(
                        Q(assessment__section=student.section) | Q(assessment__section__isnull=True)
                    )
                else:
                    result_qs = result_qs.filter(assessment__section__isnull=True)

                percentages = []
                for result in result_qs:
                    total_marks = max(float(getattr(result.assessment, "total_marks", 0) or 0), 1.0)
                    percentages.append((float(result.score) / total_marks) * 100.0)

                if not percentages:
                    insufficient_data += 1
                    skipped += 1
                    continue

                average_score = sum(percentages) / len(percentages)
                if average_score < rules.min_score_percentage:
                    failed_score += 1
                    skipped += 1
                    continue

            if rules.min_attendance_percentage is not None:
                attendance_qs = Attendance.objects.filter(
                    student=student,
                    subject__academic_class=student.academic_class,
                )
                if academic_year is not None:
                    attendance_qs = attendance_qs.filter(
                        date__gte=academic_year.start_date,
                        date__lte=academic_year.end_date,
                    )

                total_attendance = attendance_qs.count()
                if total_attendance <= 0:
                    insufficient_data += 1
                    skipped += 1
                    continue

                attended_count = attendance_qs.filter(status__in=["present", "late", "excused"]).count()
                attendance_percentage = (attended_count / total_attendance) * 100.0
                if attendance_percentage < rules.min_attendance_percentage:
                    failed_attendance += 1
                    skipped += 1
                    continue

        idx = class_index[student.academic_class_id]
        if idx >= len(classes) - 1:
            skipped += 1
            continue

        next_class = classes[idx + 1]
        next_section = None
        if student.section_id:
            next_section = Section.objects.filter(
                academic_class=next_class,
                name=student.section.name,
            ).first()

        student.academic_class = next_class
        student.section = next_section
        student.save(update_fields=["academic_class", "section"])

        if student_id_text in manual_promote_ids:
            manual_promoted += 1
        promoted += 1

    return {
        "promoted_students": promoted,
        "skipped_students": skipped,
        "failed_score": failed_score,
        "failed_attendance": failed_attendance,
        "manual_promoted": manual_promoted,
        "manual_held": manual_held,
        "insufficient_data": insufficient_data,
    }


@transaction.atomic
def rollover_academic_year(
    *,
    source_year: AcademicYear,
    target_year: AcademicYear,
    options: YearRolloverOptions,
) -> Dict[str, int]:
    summary = {
        "subjects_migrated": 0,
        "chapters_migrated": 0,
        "lessons_migrated": 0,
        "materials_migrated": 0,
        "assessments_migrated": 0,
        "questions_migrated": 0,
        "timetable_entries_migrated": 0,
        "students_promoted": 0,
        "students_skipped": 0,
    }

    year_delta_days = (target_year.start_date - source_year.start_date).days

    def shift_datetime(value):
        if value is None:
            return None
        return value + timedelta(days=year_delta_days)

    source_subjects = Subject.objects.filter(academic_year=source_year).select_related("academic_class", "teacher")
    subject_map: Dict[int, Subject] = {}

    if options.migrate_subjects:
        for source_subject in source_subjects:
            target_subject, created = Subject.objects.get_or_create(
                name=source_subject.name,
                academic_class=source_subject.academic_class,
                academic_year=target_year,
                defaults={
                    "code": source_subject.code,
                    "description": source_subject.description,
                    "credits": source_subject.credits,
                    "is_elective": source_subject.is_elective,
                    "is_active": source_subject.is_active,
                    "teacher": source_subject.teacher,
                },
            )
            if created:
                target_subject.additional_teachers.set(source_subject.additional_teachers.all())
                summary["subjects_migrated"] += 1
            subject_map[source_subject.id] = target_subject
    else:
        # Build best-effort map against already-existing subjects in target year.
        for source_subject in source_subjects:
            mapped = Subject.objects.filter(
                name=source_subject.name,
                academic_class=source_subject.academic_class,
                academic_year=target_year,
            ).first()
            if mapped:
                subject_map[source_subject.id] = mapped

    assessment_map: Dict[str, Assessment] = {}
    if options.migrate_assessments and subject_map:
        source_assessments = Assessment.objects.filter(
            academic_year=source_year,
            subject_id__in=subject_map.keys(),
        ).select_related("subject", "section").prefetch_related("questions")

        for source_assessment in source_assessments:
            target_subject = subject_map.get(source_assessment.subject_id)
            if not target_subject:
                continue

            target_section = None
            if source_assessment.section_id:
                target_section = Section.objects.filter(
                    academic_class=source_assessment.section.academic_class,
                    name=source_assessment.section.name,
                ).first()

            target_assessment, created = Assessment.objects.get_or_create(
                academic_year=target_year,
                subject=target_subject,
                section=target_section,
                title=source_assessment.title,
                type=source_assessment.type,
                defaults={
                    "description": source_assessment.description,
                    "total_marks": source_assessment.total_marks,
                    "passing_marks": source_assessment.passing_marks,
                    "scheduled_at": shift_datetime(source_assessment.scheduled_at),
                    "due_date": shift_datetime(source_assessment.due_date),
                    "duration_minutes": source_assessment.duration_minutes,
                    "blooms_level": source_assessment.blooms_level,
                    "is_final_assessment": source_assessment.is_final_assessment,
                },
            )

            assessment_map[str(source_assessment.assessment_id)] = target_assessment

            if created:
                summary["assessments_migrated"] += 1
                questions_to_create = []
                for source_question in source_assessment.questions.all():
                    questions_to_create.append(
                        Question(
                            assessment=target_assessment,
                            text=source_question.text,
                            type=source_question.type,
                            tags=source_question.tags,
                            difficulty=source_question.difficulty,
                            options=source_question.options,
                            correct_answer=source_question.correct_answer,
                            points=source_question.points,
                            order=source_question.order,
                        )
                    )
                if questions_to_create:
                    Question.objects.bulk_create(questions_to_create, batch_size=200)
                    summary["questions_migrated"] += len(questions_to_create)

    if options.migrate_lessons and subject_map:
        source_chapters = Chapter.objects.filter(
            subject_id__in=subject_map.keys()
        ).select_related("subject").prefetch_related("lessons__materials")

        for source_chapter in source_chapters:
            target_subject = subject_map.get(source_chapter.subject_id)
            if not target_subject:
                continue

            target_chapter, chapter_created = Chapter.objects.get_or_create(
                subject=target_subject,
                title=source_chapter.title,
                order=source_chapter.order,
                defaults={
                    "description": source_chapter.description,
                    "is_published": source_chapter.is_published,
                },
            )
            if chapter_created:
                summary["chapters_migrated"] += 1

            for source_lesson in source_chapter.lessons.all():
                linked_assessment = None
                if source_lesson.assessment_id:
                    linked_assessment = assessment_map.get(str(source_lesson.assessment_id))

                target_lesson, lesson_created = Lesson.objects.get_or_create(
                    chapter=target_chapter,
                    title=source_lesson.title,
                    order=source_lesson.order,
                    defaults={
                        "content_type": source_lesson.content_type,
                        "content": source_lesson.content,
                        "video_url": source_lesson.video_url,
                        "interactive_data": source_lesson.interactive_data,
                        "assessment": linked_assessment,
                        "is_published": source_lesson.is_published,
                        "duration_minutes": source_lesson.duration_minutes,
                    },
                )

                if not lesson_created and linked_assessment and target_lesson.assessment_id != linked_assessment.assessment_id:
                    target_lesson.assessment = linked_assessment
                    target_lesson.save(update_fields=["assessment"])

                if lesson_created:
                    summary["lessons_migrated"] += 1
                    materials_to_create = []
                    for source_material in source_lesson.materials.all():
                        materials_to_create.append(
                            LessonMaterial(
                                lesson=target_lesson,
                                title=source_material.title,
                                file=source_material.file,
                                link=source_material.link,
                                material_type=source_material.material_type,
                            )
                        )
                    if materials_to_create:
                        LessonMaterial.objects.bulk_create(materials_to_create, batch_size=200)
                        summary["materials_migrated"] += len(materials_to_create)

    if options.migrate_timetable:
        source_slots = Timetable.objects.filter(academic_year=source_year).select_related("teacher")
        timetable_to_create = []
        for source_slot in source_slots:
            already_exists = Timetable.objects.filter(
                academic_year=target_year,
                academic_class=source_slot.academic_class,
                day_of_week=source_slot.day_of_week,
                start_time=source_slot.start_time,
                end_time=source_slot.end_time,
                subject_name=source_slot.subject_name,
                entry_type=source_slot.entry_type,
            ).exists()
            if already_exists:
                continue

            timetable_to_create.append(
                Timetable(
                    academic_year=target_year,
                    academic_class=source_slot.academic_class,
                    day_of_week=source_slot.day_of_week,
                    start_time=source_slot.start_time,
                    end_time=source_slot.end_time,
                    subject_name=source_slot.subject_name,
                    teacher=source_slot.teacher,
                    room_number=source_slot.room_number,
                    entry_type=source_slot.entry_type,
                    status=source_slot.status,
                    approval_comment=source_slot.approval_comment,
                    created_by=source_slot.created_by,
                    approved_by=source_slot.approved_by,
                    approved_at=source_slot.approved_at,
                )
            )

        if timetable_to_create:
            Timetable.objects.bulk_create(timetable_to_create, batch_size=200)
            summary["timetable_entries_migrated"] = len(timetable_to_create)

    if options.auto_upgrade_students:
        promotion_summary = promote_students_to_next_class(
            academic_year=source_year,
            rules=options.promotion_rules,
        )
        summary["students_promoted"] = promotion_summary["promoted_students"]
        summary["students_skipped"] = promotion_summary["skipped_students"]

    _set_current_year(target_year)
    return summary

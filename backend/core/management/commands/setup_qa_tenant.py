"""
QA Tenant Setup Management Command
===================================
Creates a dedicated 'qa' tenant with comprehensive dummy data across ALL modules:
  Academic, Library, Notifications, Gamification, Conversations, Billing.

Usage:
  python manage.py setup_qa_tenant              # create / refresh QA tenant
  python manage.py setup_qa_tenant --clear      # drop and recreate from scratch
  python manage.py setup_qa_tenant --output /tmp/qa_creds.json

Outputs a JSON block with all credentials and IDs used by Playwright QA tests.
"""
import json
import random
import string
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import connection

from django_tenants.utils import schema_context

from core.models import Tenant
from core.models.tenant import Domain
from users.models import UserAccount


# ─── Fixed credentials (used by Playwright) ───────────────────────────────────
QA_SCHEMA    = 'qa'
QA_SUBDOMAIN = 'qa'
QA_DOMAIN    = 'qa.localhost'

CREDS = {
    'admin':   {'email': 'admin@qa.test',   'password': 'QAAdmin123!',   'first_name': 'Admin',   'last_name': 'QA',   'role': 'admin'},
    'staff':   {'email': 'staff@qa.test',   'password': 'QAStaff123!',   'first_name': 'Staff',   'last_name': 'QA',   'role': 'staff'},
    'teacher': {'email': 'teacher@qa.test', 'password': 'QATeacher123!', 'first_name': 'Teacher', 'last_name': 'QA',   'role': 'teacher'},
    'teacher2':{'email': 'teacher2@qa.test','password': 'QATeacher123!', 'first_name': 'Second',  'last_name': 'Teacher', 'role': 'teacher'},
    'student': {'email': 'student@qa.test', 'password': 'QAStudent123!', 'first_name': 'Student', 'last_name': 'QA',   'role': 'student'},
    'student2':{'email': 'student2@qa.test','password': 'QAStudent123!', 'first_name': 'Second',  'last_name': 'Student', 'role': 'student'},
    'parent':  {'email': 'parent@qa.test',  'password': 'QAParent123!',  'first_name': 'Parent',  'last_name': 'QA',   'role': 'parent'},
}


class Command(BaseCommand):
    help = 'Creates a QA test tenant with full dummy data for all modules'

    def add_arguments(self, parser):
        parser.add_argument('--schema',  default=QA_SCHEMA,  help='Schema name (default: qa)')
        parser.add_argument('--clear',   action='store_true', help='Drop and recreate QA tenant')
        parser.add_argument('--output',  default='',          help='Write credentials JSON to this file path')

    def handle(self, *args, **options):
        schema = options['schema']

        if options['clear']:
            self._drop_tenant(schema)

        tenant = self._ensure_tenant(schema)
        users  = self._ensure_users(tenant)

        context = {}

        with schema_context(schema):
            context.update(self._setup_academic(tenant, users))
            context.update(self._setup_library())
            context.update(self._setup_notifications(tenant, users))
            context.update(self._setup_gamification(tenant, users))
            context.update(self._setup_conversations(tenant, users))
            context.update(self._setup_billing(users))

        output = {
            'schema':  schema,
            'tenant':  schema,
            'creds':   {k: {'email': v['email'], 'password': v['password'], 'role': v['role']}
                        for k, v in CREDS.items()},
            'data':    context,
        }

        self.stdout.write(self.style.SUCCESS('\n✓ QA tenant ready'))
        self.stdout.write(json.dumps(output, indent=2, default=str))

        if options['output']:
            with open(options['output'], 'w') as f:
                json.dump(output, f, indent=2, default=str)
            self.stdout.write(self.style.SUCCESS(f'\n✓ Credentials written to {options["output"]}'))

    # ── Tenant ─────────────────────────────────────────────────────────────────

    def _drop_tenant(self, schema):
        self.stdout.write(self.style.WARNING(f'Dropping tenant schema={schema}...'))
        try:
            tenant = Tenant.objects.get(schema_name=schema)
            tenant.delete()  # django-tenants drops the schema on delete
            self.stdout.write(self.style.WARNING('  ✓ Dropped'))
        except Tenant.DoesNotExist:
            self.stdout.write('  (not found, skipping)')
        # Also remove any leftover users
        UserAccount.objects.filter(email__endswith='@qa.test').delete()

    def _ensure_tenant(self, schema):
        tenant, created = Tenant.objects.get_or_create(
            schema_name=schema,
            defaults={
                'name': 'QA Test School',
                'subdomain': QA_SUBDOMAIN,
                'type': 'standard',
                'status': 'active',
                'contact_email': 'qa@qa.test',
                'current_academic_year': '2025-2026',
            },
        )
        Domain.objects.get_or_create(
            domain=QA_DOMAIN,
            defaults={'tenant': tenant, 'is_primary': True},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Tenant created: {tenant.name} (schema={schema})'))
        else:
            self.stdout.write(f'  ✓ Tenant exists: {tenant.name}')
        return tenant

    # ── Users (public schema) ──────────────────────────────────────────────────

    def _ensure_users(self, tenant):
        users = {}
        for key, c in CREDS.items():
            username = c['email'].replace('@', '_').replace('.', '_')
            user, created = UserAccount.objects.get_or_create(
                email=c['email'],
                defaults={
                    'username':   username,
                    'first_name': c['first_name'],
                    'last_name':  c['last_name'],
                    'role':       c['role'],
                    'tenant':     tenant,
                    'is_active':  True,
                },
            )
            if created:
                user.set_password(c['password'])
                user.save()
            users[key] = user
        self.stdout.write(self.style.SUCCESS(f'  ✓ Users: {len(users)}'))
        return users

    # ── Academic ───────────────────────────────────────────────────────────────

    def _setup_academic(self, tenant, users):
        from academic.models import (
            AcademicYear, AcademicClass, Section, Subject,
            Chapter, Lesson, Assessment, Result, Teacher, Student, Parent,
        )

        # Academic year
        year, _ = AcademicYear.objects.get_or_create(
            name='2025-2026',
            defaults={'start_date': date(2025, 4, 1), 'end_date': date(2026, 3, 31), 'is_current': True},
        )

        # Class + Section
        cls, _ = AcademicClass.objects.get_or_create(name='Grade 10', defaults={'order': 10})
        section, _ = Section.objects.get_or_create(name='A', academic_class=cls, defaults={'capacity': 40})

        # Teacher profile
        teacher_profile, _ = Teacher.objects.get_or_create(user=users['teacher'])

        # Subject
        subject, _ = Subject.objects.get_or_create(
            name='Mathematics', academic_class=cls, academic_year=year,
            defaults={'code': 'MATH10', 'teacher': teacher_profile, 'is_active': True},
        )

        # Chapter
        chapter, _ = Chapter.objects.get_or_create(
            subject=subject, title='Chapter 1: Algebra Basics',
            defaults={'order': 1, 'is_published': True},
        )

        # Lessons
        lesson_data = [
            ('Introduction to Variables', 'text',  'Variables are symbols used to represent numbers.'),
            ('Solving Linear Equations', 'text',  'To solve ax+b=c, isolate x.'),
            ('Quadratic Equations',      'video', 'Watch the lecture on quadratic equations.'),
        ]
        lessons = []
        for i, (title, ctype, content) in enumerate(lesson_data, 1):
            lesson, _ = Lesson.objects.get_or_create(
                chapter=chapter, title=title,
                defaults={'content_type': ctype, 'content': content, 'order': i, 'is_published': True, 'duration_minutes': 30},
            )
            lessons.append(lesson)

        # Student profiles
        student_profile,  _ = Student.objects.get_or_create(
            user=users['student'],
            defaults={'academic_class': cls, 'section': section},
        )
        student_profile2, _ = Student.objects.get_or_create(
            user=users['student2'],
            defaults={'academic_class': cls, 'section': section},
        )

        # Assessment
        assessment, _ = Assessment.objects.get_or_create(
            subject=subject, title='QA Unit Test 1',
            defaults={
                'type': 'quiz', 'total_marks': 100,
                'section': section, 'academic_year': year,
                'due_date': date.today() + timedelta(days=7),
            },
        )

        # Results
        for sp in [student_profile, student_profile2]:
            Result.objects.get_or_create(
                assessment=assessment, student=sp,
                defaults={'obtained_marks': random.randint(60, 100)},
            )

        # Parent
        parent_profile, _ = Parent.objects.get_or_create(
            user=users['parent'],
            defaults={'phone_number': '+9771234567890'},
        )
        parent_profile.students.add(student_profile)

        self.stdout.write(self.style.SUCCESS(
            f'  ✓ Academic: year={year.name}, class={cls.name}, '
            f'section={section.name}, subject={subject.name}, '
            f'chapter, {len(lessons)} lessons, assessment, results, parent'
        ))
        return {
            'academic_year_id':  year.pk,
            'class_id':          cls.pk,
            'section_id':        section.pk,
            'subject_id':        subject.pk,
            'chapter_id':        chapter.pk,
            'lesson_ids':        [l.pk for l in lessons],
            'assessment_id':     str(assessment.assessment_id),
            'teacher_profile_id': str(teacher_profile.pk) if hasattr(teacher_profile.pk, '__str__') else teacher_profile.pk,
            'student_profile_id': str(student_profile.student_id),
        }

    # ── Library ────────────────────────────────────────────────────────────────

    def _setup_library(self):
        from library.models import Book

        books_data = [
            ('Introduction to Algebra',       'Prof. Smith',    'mathematics', '9780000000001'),
            ('Python Programming for Beginners','Jane Doe',     'technology',  '9780000000002'),
            ('World History Vol. 1',           'A. Historian',  'history',     '9780000000003'),
        ]
        book_ids = []
        for title, author, category, isbn in books_data:
            book, _ = Book.objects.get_or_create(
                isbn=isbn,
                defaults={
                    'title': title, 'author': author, 'category': category,
                    'total_copies': 5, 'available_copies': 5,
                    'publisher': 'QA Publisher', 'published_year': 2024,
                },
            )
            book_ids.append(str(book.book_id))

        self.stdout.write(self.style.SUCCESS(f'  ✓ Library: {len(book_ids)} books'))
        return {'book_ids': book_ids}

    # ── Notifications ──────────────────────────────────────────────────────────

    def _setup_notifications(self, tenant, users):
        from notifications.models import NotificationTemplate, Notification

        tmpl, _ = NotificationTemplate.objects.get_or_create(
            name='QA Test Template',
            defaults={
                'tenant': tenant,
                'subject_template': 'QA Notification: {title}',
                'body_template': 'Dear {name}, this is a QA test notification.',
                'type': 'app',
                'is_active': True,
            },
        )

        notif, _ = Notification.objects.get_or_create(
            title='QA Test Notification',
            recipient=users['student'],
            defaults={
                'tenant': tenant,
                'message': 'This is a test notification created by the QA setup command.',
                'is_read': False,
            },
        )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Notifications: 1 template, 1 notification'))
        return {'notification_template_id': tmpl.pk, 'notification_id': notif.pk}

    # ── Gamification ───────────────────────────────────────────────────────────

    def _setup_gamification(self, tenant, users):
        from gamification.models import Badge, GamificationProfile

        badge, _ = Badge.objects.get_or_create(
            tenant=tenant, name='QA First Badge',
            defaults={
                'description': 'Awarded for completing the first lesson in QA.',
                'icon_name': 'award',
                'criteria_type': 'lessons_completed',
                'criteria_value': 1,
                'xp_reward': 50,
            },
        )

        profile, _ = GamificationProfile.objects.get_or_create(
            user=users['student'],
            defaults={'tenant': tenant, 'total_xp': 100, 'current_streak': 3},
        )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Gamification: 1 badge, 1 profile'))
        return {'badge_id': str(badge.id), 'gamification_profile_id': str(profile.id) if hasattr(profile, 'id') else profile.pk}

    # ── Conversations ──────────────────────────────────────────────────────────

    def _setup_conversations(self, tenant, users):
        from conversations.models import Conversation, ConversationParticipant, Message

        conv, _ = Conversation.objects.get_or_create(
            tenant=tenant, title='QA Test Conversation',
            defaults={'type': 'direct'},
        )

        for user in [users['teacher'], users['student']]:
            ConversationParticipant.objects.get_or_create(conversation=conv, user=user)

        msg, _ = Message.objects.get_or_create(
            conversation=conv, sender=users['teacher'],
            content='Hello from QA teacher!',
            defaults={'is_system_message': False},
        )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Conversations: 1 conversation, 1 message'))
        return {'conversation_id': str(conv.conversation_id)}

    # ── Billing ────────────────────────────────────────────────────────────────

    def _setup_billing(self, users):
        try:
            from billing_school.models import FeeStructure, StudentFee

            fee_structure, _ = FeeStructure.objects.get_or_create(
                name='QA Tuition Fee',
                defaults={
                    'amount': 5000.00,
                    'frequency': 'monthly',
                    'description': 'QA test fee structure',
                    'is_active': True,
                },
            )

            # StudentFee requires a Student — try to link to qa student
            from academic.models import Student
            try:
                student = Student.objects.get(user=users['student'])
                StudentFee.objects.get_or_create(
                    student=student, fee_structure=fee_structure,
                    defaults={'amount_due': 5000.00, 'due_date': date.today() + timedelta(days=30)},
                )
            except Student.DoesNotExist:
                pass

            self.stdout.write(self.style.SUCCESS(f'  ✓ Billing: 1 fee structure'))
            return {'fee_structure_id': fee_structure.pk}
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  ⚠ Billing skipped: {e}'))
            return {}

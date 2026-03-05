# Architecture Snapshot

- Generated at: `2026-03-05 21:51:12 +0545`
- Repo root: `/Users/pramodsinghmanyal/Desktop/E-LearningWebApp`
- Tree depth: `4` (override with `ARCH_REPORT_TREE_DEPTH`)

## Repo Tree (excluding node_modules)

```text
.
├── .DS_Store
├── .agent
│   ├── architecture
│   │   ├── architecture-diagrams.md
│   │   └── diagrams
│   ├── planning
│   │   ├── 01-sprint-planning-backlog.md
│   │   ├── 02-technical-feasibility.md
│   │   ├── 03-dependency-management.md
│   │   ├── 04-risk-assessment.md
│   │   ├── 05-release-roadmap.md
│   │   ├── IMPROVEMENTS_ANALYSIS.md
│   │   └── README.md
│   ├── product-discovery
│   │   ├── 01-product-vision.md
│   │   ├── 02-user-personas.md
│   │   ├── 03-mvp-features-backlog.md
│   │   ├── 04-user-stories.md
│   │   ├── 05-stakeholder-discussion-guide.md
│   │   └── README.md
│   ├── project-management
│   │   ├── README.md
│   │   └── project-board-setup.md
│   └── sdlc-workflow
│       ├── 01-discovery-problem-definition.md
│       ├── 02-mvp-scope-and-roadmap.md
│       ├── 03-system-architecture-and-tech-decisions.md
│       ├── 04-ux-ui-design.md
│       ├── 05-data-model-and-api-contract.md
│       ├── 06-devops-baseline.md
│       ├── 07-implementation-agile-sprints.md
│       ├── 08-testing-and-quality.md
│       ├── 09-security-and-compliance-hardening.md
│       ├── 10-beta-launch-pilot-schools.md
│       ├── 11-production-launch.md
│       ├── 12-scale-and-optimize.md
│       ├── README.md
│       ├── checklists
│       │   ├── production-launch-checklist.md
│       │   └── release-test-gate-checklist.md
│       ├── database-design-used.md
│       ├── database-er-diagrams.md
│       ├── project-design-used.md
│       ├── project-sdlc-as-implemented.md
│       └── templates
│           ├── adr-template.md
│           ├── api-contract-template.md
│           ├── beta-launch-template.md
│           ├── data-model-template.md
│           ├── devops-readiness-checklist.md
│           ├── incident-response-template.md
│           ├── mvp-roadmap-template.md
│           ├── observability-plan-template.md
│           ├── persona-template.md
│           ├── prd-template.md
│           ├── release-notes-template.md
│           ├── risk-register-template.md
│           ├── scale-optimization-template.md
│           ├── security-hardening-template.md
│           ├── sprint-execution-template.md
│           ├── storage-strategy-template.md
│           ├── test-strategy-template.md
│           └── ux-review-checklist.md
├── .env
├── .expo
│   ├── README.md
│   └── settings.json
├── .github
│   ├── ISSUE_TEMPLATE
│   │   ├── bug-report.md
│   │   ├── technical-task.md
│   │   └── user-story.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── playwright.yml
├── .gitignore
├── .python-version
├── .railway
├── Procfile
├── README.md
├── SPRINT4-SUMMARY.txt
├── api
│   └── schema
├── apt.txt
├── backend
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── .python-version
│   ├── Dockerfile
│   ├── Procfile
│   ├── academic
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── management
│   │   │   └── commands
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   ├── 0003_initial.py
│   │   │   ├── 0004_subject_additional_teachers.py
│   │   │   ├── 0005_timetable_workflow_fields.py
│   │   │   ├── 0006_timetable_tt_class_day_idx_and_more.py
│   │   │   ├── 0007_lessonprogress_video_tracking.py
│   │   │   ├── 0008_alter_subject_unique_together_and_more.py
│   │   │   ├── 0009_admissionenquiry.py
│   │   │   ├── 0010_studentpromotiondecision.py
│   │   │   ├── 0011_studentpromotiondecision_reason_and_history.py
│   │   │   ├── 0012_assessmentresultpublicationaudit.py
│   │   │   ├── 0013_attendance_student_indexes.py
│   │   │   ├── 0014_alter_lessonmaterial_file_alter_notice_attachment.py
│   │   │   └── __init__.py
│   │   ├── models
│   │   │   ├── __init__.py
│   │   │   ├── academic_year.py
│   │   │   ├── admission.py
│   │   │   ├── assessment.py
│   │   │   ├── attendance.py
│   │   │   ├── class_section.py
│   │   │   ├── exam.py
│   │   │   ├── lesson.py
│   │   │   ├── notice.py
│   │   │   ├── parent.py
│   │   │   ├── question.py
│   │   │   ├── student.py
│   │   │   ├── subject.py
│   │   │   ├── submission.py
│   │   │   ├── teacher.py
│   │   │   └── timetable.py
│   │   ├── serializers
│   │   │   ├── __init__.py
│   │   │   ├── academic.py
│   │   │   ├── admission.py
│   │   │   ├── assessment.py
│   │   │   ├── exam.py
│   │   │   ├── lesson.py
│   │   │   ├── notice.py
│   │   │   ├── profiles.py
│   │   │   ├── student_portal.py
│   │   │   └── timetable.py
│   │   ├── services
│   │   │   ├── academic_year_service.py
│   │   │   ├── bulk_import.py
│   │   │   ├── exam_service.py
│   │   │   └── grading_service.py
│   │   ├── signals.py
│   │   ├── tasks.py
│   │   ├── tests_ai_feedback.py
│   │   ├── tests_assessment_rbac.py
│   │   ├── tests_attendance_rbac.py
│   │   ├── tests_audit_logging.py
│   │   ├── tests_exam_rbac.py
│   │   ├── tests_grading.py
│   │   ├── tests_reports.py
│   │   ├── tests_student_creation.py
│   │   ├── tests_student_profile.py
│   │   ├── tests_teacher_profile.py
│   │   ├── tests_timetable.py
│   │   ├── tests_year_rollover_and_promotion.py
│   │   ├── urls.py
│   │   └── views
│   │       ├── __init__.py
│   │       ├── academic.py
│   │       ├── admission.py
│   │       ├── assessment.py
│   │       ├── attendance.py
│   │       ├── erp.py
│   │       ├── exam.py
│   │       ├── lesson.py
│   │       ├── notice.py
│   │       ├── profiles.py
│   │       ├── reports.py
│   │       ├── stats.py
│   │       ├── student_portal.py
│   │       └── timetable.py
│   ├── add_books.py
│   ├── ai_engine
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── management
│   │   │   └── commands
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   ├── 0003_initial.py
│   │   │   ├── 0004_contentchunk.py
│   │   │   ├── 0005_aigeneratedartifact.py
│   │   │   ├── 0006_alter_aigeneratedartifact_choices.py
│   │   │   ├── 0007_gradingrubric_aigradingdraft.py
│   │   │   └── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── services
│   │   │   ├── admin_assistant_service.py
│   │   │   ├── assisted_grading_service.py
│   │   │   ├── exam_generator_service.py
│   │   │   ├── grading_service.py
│   │   │   ├── indexing_service.py
│   │   │   ├── learning_path_service.py
│   │   │   ├── lesson_summary_service.py
│   │   │   ├── model_discovery.py
│   │   │   ├── personalization_service.py
│   │   │   ├── predictive_service.py
│   │   │   ├── provider_config.py
│   │   │   ├── quiz_generator_service.py
│   │   │   ├── rag_tutor_service.py
│   │   │   ├── reporting_service.py
│   │   │   ├── risk_analytics_service.py
│   │   │   ├── schedule_service.py
│   │   │   └── tutor_service.py
│   │   ├── tasks.py
│   │   ├── tests_admin_assistant_api.py
│   │   ├── tests_assisted_grading_api.py
│   │   ├── tests_async_queue.py
│   │   ├── tests_contentchunk.py
│   │   ├── tests_exam_generator_api.py
│   │   ├── tests_lesson_artifacts.py
│   │   ├── tests_provider_config.py
│   │   ├── tests_quiz_generator_api.py
│   │   ├── tests_risk_analytics.py
│   │   ├── tests_risk_analytics_api.py
│   │   ├── tests_tutor_api.py
│   │   ├── throttling.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── apply_tenant_migration_ai.py
│   ├── attendance_test.pdf
│   ├── attendance_test.xlsx
│   ├── billing
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── idempotency.py
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   ├── 0003_subscriptionplanhistory.py
│   │   │   ├── 0004_billingidempotencykey.py
│   │   │   ├── 0005_expense_bill_exp_tenant_date_idx_and_more.py
│   │   │   └── __init__.py
│   │   ├── models.py
│   │   ├── permissions.py
│   │   ├── plan_defaults.py
│   │   ├── serializers.py
│   │   ├── tasks.py
│   │   ├── tests_security.py
│   │   ├── urls.py
│   │   ├── views.py
│   │   └── views_reports.py
│   ├── check_auth.py
│   ├── check_demo_schema.py
│   ├── check_tables.py
│   ├── config
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── celery.py
│   │   ├── db.sqlite3
│   │   ├── db.sqlite3.backup
│   │   ├── db.sqlite3.bak
│   │   ├── debug.log
│   │   ├── school_demo.sqlite3
│   │   ├── settings
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   ├── production.py
│   │   │   └── test.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── conversations
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── ai_handler.py
│   │   ├── apps.py
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   ├── 0003_initial.py
│   │   │   └── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── core
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── async_jobs.py
│   │   ├── exceptions.py
│   │   ├── logging_context.py
│   │   ├── management
│   │   │   ├── __init__.py
│   │   │   └── commands
│   │   ├── metrics.py
│   │   ├── middleware
│   │   │   └── __init__.py
│   │   ├── middleware.py
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   ├── 0003_tenant_features.py
│   │   │   ├── 0004_tenant_subdomain.py
│   │   │   ├── 0005_globalsettings_ai_provider_fields.py
│   │   │   ├── 0006_alter_tenant_logo.py
│   │   │   ├── 0007_enable_pgvector_extension.py
│   │   │   └── __init__.py
│   │   ├── mixins.py
│   │   ├── models
│   │   │   ├── __init__.py
│   │   │   ├── audit_log.py
│   │   │   ├── base.py
│   │   │   ├── settings.py
│   │   │   └── tenant.py
│   │   ├── pagination.py
│   │   ├── reports.py
│   │   ├── schema.py
│   │   ├── serializers.py
│   │   ├── templates
│   │   │   └── reports
│   │   ├── tests.py
│   │   ├── tests_admin_audit.py
│   │   ├── tests_async_jobs.py
│   │   ├── tests_cache_keys.py
│   │   ├── tests_logging_context.py
│   │   ├── tests_metrics.py
│   │   ├── tests_openapi.py
│   │   ├── tests_pagination.py
│   │   ├── tests_security_headers.py
│   │   ├── tests_storage_paths.py
│   │   ├── tests_tenant.py
│   │   ├── tests_tenant_security.py
│   │   ├── urls.py
│   │   ├── utils
│   │   │   ├── audit.py
│   │   │   ├── cache_keys.py
│   │   │   ├── plan_enforcement.py
│   │   │   ├── storage_paths.py
│   │   │   ├── tenant_db.py
│   │   │   └── tenant_users.py
│   │   ├── vector.py
│   │   ├── vendor
│   │   │   ├── __init__.py
│   │   │   ├── inflection_fallback.py
│   │   │   └── uritemplate_fallback.py
│   │   ├── views.py
│   │   └── views_saas.py
│   ├── create_demo_accounts.py
│   ├── create_library_tables.py
│   ├── create_library_tables_final.py
│   ├── create_library_tables_simple.py
│   ├── create_tables.sh
│   ├── create_tables.sql
│   ├── create_tables_direct.py
│   ├── create_tables_v2.py
│   ├── create_tables_v3.py
│   ├── create_test_users.py
│   ├── create_via_django.py
│   ├── debug_auth.py
│   ├── debug_check_urls.py
│   ├── debug_connectivity.py
│   ├── debug_django.py
│   ├── debug_notices.py
│   ├── debug_teacher.py
│   ├── final_debug.py
│   ├── fix_gamification.py
│   ├── fix_library_migration.py
│   ├── fix_schema.py
│   ├── fix_tables_now.py
│   ├── fix_tenant_migration.py
│   ├── gamification
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── management
│   │   │   └── commands
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   └── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── services
│   │   │   └── gamification_service.py
│   │   ├── signals.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── init_tenant.py
│   ├── library
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── management
│   │   │   └── commands
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   └── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── tests_security.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── manage.py
│   ├── migrate_library.sh
│   ├── migrate_tenant_v2.py
│   ├── notices
│   │   └── 79-80.pdf
│   ├── notifications
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── management
│   │   │   └── commands
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   └── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── signals.py
│   │   ├── tasks.py
│   │   ├── tests_async_delivery.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── populate_assessments.py
│   ├── populate_questions.py
│   ├── populate_system.py
│   ├── print_db.py
│   ├── reports
│   │   └── __init__.py
│   ├── reproduction.py
│   ├── requirements
│   │   ├── base.txt
│   │   ├── local.txt
│   │   └── production.txt
│   ├── requirements.txt
│   ├── run_dev.sh
│   ├── run_library_migration.py
│   ├── scripts
│   │   ├── __init__.py
│   │   ├── create_test_accounts.py
│   │   ├── debug_orphans.py
│   │   ├── debug_report.py
│   │   ├── deploy_migrations.py
│   │   ├── migrate_tenant.py
│   │   ├── perf_check.py
│   │   ├── populate_library.py
│   │   ├── run_alerts.py
│   │   ├── setup_interactive_demo.py
│   │   ├── verify_alerts.py
│   │   ├── verify_assessment.py
│   │   ├── verify_backup.py
│   │   ├── verify_communication.py
│   │   ├── verify_course_flow.py
│   │   ├── verify_finance.py
│   │   ├── verify_gamification.py
│   │   ├── verify_library.py
│   │   ├── verify_performance.py
│   │   ├── verify_report_optimization.py
│   │   └── verify_reports.py
│   ├── seed_class_data.py
│   ├── seed_demo.py
│   ├── seed_gamification.py
│   ├── seed_saas_data.py
│   ├── setup_tenant_db.py
│   ├── setup_test_users.py
│   ├── test_create_assessment.py
│   ├── test_db.py
│   ├── test_db2.py
│   ├── test_library.py
│   ├── test_output.py
│   ├── test_teacher_api.py
│   ├── users
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── authentication.py
│   │   ├── migrations
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_add_2fa_fields.py
│   │   │   ├── 0003_alter_useraccount_role.py
│   │   │   ├── 0004_alter_useraccount_first_name_and_more.py
│   │   │   ├── 0005_useraccount_users_tenant_role_idx_and_more.py
│   │   │   └── __init__.py
│   │   ├── models.py
│   │   ├── permissions.py
│   │   ├── serializers.py
│   │   ├── tests.py
│   │   ├── tests_admin_audit.py
│   │   ├── tests_audit.py
│   │   ├── tests_auth.py
│   │   ├── tests_profile.py
│   │   ├── tests_rbac.py
│   │   ├── tests_reset.py
│   │   ├── tests_tenant_auth.py
│   │   ├── tests_token_policy.py
│   │   ├── throttling.py
│   │   ├── token_policy.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── verify_23f4c4ac.sqlite3
│   ├── verify_799f26f7.sqlite3
│   ├── verify_8a28c27e.sqlite3
│   ├── verify_admin_panel.py
│   ├── verify_analytics.py
│   ├── verify_api.py
│   ├── verify_assessment_flow.py
│   ├── verify_assessments.py
│   ├── verify_billing_db.py
│   ├── verify_exams.py
│   ├── verify_gamification.py
│   ├── verify_hall_tickets.py
│   ├── verify_import_service.py
│   ├── verify_interactive.py
│   ├── verify_learning_path.py
│   ├── verify_lesson_api.py
│   ├── verify_librarian_dashboard.py
│   ├── verify_library.py
│   ├── verify_library_student.py
│   ├── verify_models.py
│   ├── verify_parent_portal.py
│   ├── verify_predictive_analytics.py
│   ├── verify_reports_v2.py
│   ├── verify_sprint7.py
│   ├── verify_sprint8.py
│   ├── verify_student_dashboard.py
│   ├── verify_student_submission.py
│   └── verify_teacher_fix.py
├── check_and_create_course.py
├── clean_reqs.py
├── docker-compose.yml
├── docs
│   ├── 2026-03-05-platform-hardening-roadmap.md
│   ├── ai
│   │   ├── 00-audit.md
│   │   ├── 01-pgvector-and-indexing.md
│   │   ├── 02-tutor-endpoint.md
│   │   ├── 03-lesson-summaries.md
│   │   ├── 04-quiz-generator.md
│   │   ├── 05-exam-generator.md
│   │   ├── 06-ai-grading.md
│   │   ├── 07-risk-analytics.md
│   │   └── 08-admin-assistant.md
│   ├── archive
│   │   └── 2026-03-04-docs-consolidation
│   │       ├── COMPLETE.md
│   │       ├── DEPLOYMENT_GUIDE.md
│   │       ├── FINAL-SUMMARY.md
│   │       ├── IMPLEMENTATION_PLAN.md
│   │       ├── ISSUE-1-COMPLETE.md
│   │       ├── ISSUE-1-GUIDE.md
│   │       ├── ISSUE-2-COMPLETE.md
│   │       ├── ISSUE-2-GUIDE.md
│   │       ├── ISSUE-3-COMPLETE.md
│   │       ├── ISSUE-3-GUIDE.md
│   │       ├── ISSUE-4-COMPLETE.md
│   │       ├── ISSUE-4-GUIDE.md
│   │       ├── ISSUE-5-COMPLETE.md
│   │       ├── ISSUE-5-GUIDE.md
│   │       ├── ISSUE-6-COMPLETE.md
│   │       ├── ISSUE-6-GUIDE.md
│   │       ├── ISSUE-7-COMPLETE.md
│   │       ├── ISSUE-7-GUIDE.md
│   │       ├── ISSUE-8-COMPLETE.md
│   │       ├── ISSUE-8-GUIDE.md
│   │       ├── LIBRARY_APP_REVIEW.md
│   │       ├── MANUAL-SETUP.md
│   │       ├── MOBILE_APP_GUIDE.md
│   │       ├── PARENT_PORTAL_VERIFICATION.md
│   │       ├── PROJECT-SUMMARY.md
│   │       ├── QUICK-REFERENCE.md
│   │       ├── QUICK_REFERENCE.md
│   │       ├── README.md
│   │       ├── SETUP-STATUS.md
│   │       ├── SETUP.md
│   │       ├── SPRINT1-KICKOFF.md
│   │       ├── SPRINT1-REVIEW.md
│   │       ├── SPRINT15-KICKOFF.md
│   │       ├── SPRINT2-KICKOFF.md
│   │       ├── SPRINT2-REVIEW.md
│   │       ├── SPRINT3-KICKOFF.md
│   │       ├── SPRINT3-PROGRESS.md
│   │       ├── SPRINT3-VERIFICATION.md
│   │       ├── SPRINT4-KICKOFF.md
│   │       ├── SPRINT4-PROGRESS.md
│   │       ├── SPRINT4-QUICKSTART.md
│   │       ├── SPRINT4-REVIEW.md
│   │       ├── SPRINT6-KICKOFF.md
│   │       ├── SUCCESS.md
│   │       ├── TASK_1_COMPLETE.md
│   │       ├── TASK_1_STUDENT_DASHBOARD.md
│   │       ├── TASK_2_ADMIN_PANEL.md
│   │       ├── TASK_2_COMPLETE.md
│   │       ├── TASK_3_COMPLETE.md
│   │       ├── TASK_3_PARENT_PORTAL.md
│   │       ├── TASK_4_COMPLETE.md
│   │       ├── TASK_4_LIBRARY.md
│   │       ├── TASK_5_COMPLETE.md
│   │       ├── TASK_6_COMPLETE.md
│   │       ├── TEACHER_DASHBOARD_FIX.md
│   │       ├── TEACHER_DASHBOARD_STATUS.md
│   │       ├── docs
│   │       ├── frontend
│   │       ├── mobile
│   │       └── tests
│   ├── infra
│   │   └── 01-celery-redis.md
│   ├── reports
│   │   └── arch-report-2026-03-05.md
│   └── security
│       └── tenant-hardening.md
├── fix_reqs.py
├── fix_virtualenv.py
├── frontend
│   ├── .DS_Store
│   ├── .dockerignore
│   ├── .env.example
│   ├── .gitignore
│   ├── .next
│   │   ├── build
│   │   │   ├── chunks
│   │   │   ├── package.json
│   │   │   ├── postcss.js
│   │   │   └── postcss.js.map
│   │   ├── cache
│   │   │   ├── .previewinfo
│   │   │   └── .rscinfo
│   │   ├── dev
│   │   │   ├── build-manifest.json
│   │   │   ├── cache
│   │   │   ├── logs
│   │   │   ├── package.json
│   │   │   ├── prerender-manifest.json
│   │   │   ├── react-loadable-manifest.json
│   │   │   ├── routes-manifest.json
│   │   │   ├── server
│   │   │   ├── static
│   │   │   ├── trace
│   │   │   └── types
│   │   ├── diagnostics
│   │   │   ├── build-diagnostics.json
│   │   │   └── framework.json
│   │   ├── package.json
│   │   ├── server
│   │   ├── static
│   │   │   └── 51JFwn60UhCHtai0IT1sY
│   │   ├── trace
│   │   ├── trace-build
│   │   ├── turbopack
│   │   └── types
│   │       ├── routes.d.ts
│   │       └── validator.ts
│   ├── .npmrc
│   ├── Dockerfile
│   ├── app
│   │   ├── (auth)
│   │   │   ├── forgot-password
│   │   │   ├── login
│   │   │   ├── register
│   │   │   └── reset-password
│   │   ├── (saas)
│   │   │   ├── layout.tsx
│   │   │   └── saas
│   │   ├── academic
│   │   │   └── assessments
│   │   ├── admin
│   │   │   ├── academic
│   │   │   ├── admissions
│   │   │   ├── ai-analytics
│   │   │   ├── communication
│   │   │   ├── erp
│   │   │   ├── exams
│   │   │   ├── finance
│   │   │   ├── layout.tsx
│   │   │   ├── library
│   │   │   ├── messages
│   │   │   ├── notices
│   │   │   ├── notifications
│   │   │   ├── page.tsx
│   │   │   ├── reports
│   │   │   ├── settings
│   │   │   ├── system
│   │   │   └── timetable
│   │   ├── debug-auth
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── messages
│   │   ├── offline
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── parent
│   │   │   └── page.tsx
│   │   ├── student
│   │   │   ├── achievements
│   │   │   ├── ai-tutor
│   │   │   ├── assessments
│   │   │   ├── assignments
│   │   │   ├── attendance
│   │   │   ├── classes
│   │   │   ├── courses
│   │   │   ├── exams
│   │   │   ├── fees
│   │   │   ├── grades
│   │   │   ├── layout.tsx
│   │   │   ├── leaderboard
│   │   │   ├── learning-path
│   │   │   ├── library
│   │   │   ├── messages
│   │   │   ├── notices
│   │   │   ├── notifications
│   │   │   ├── offline
│   │   │   ├── page.tsx
│   │   │   ├── profile
│   │   │   ├── quizzes
│   │   │   ├── resources
│   │   │   ├── schedule
│   │   │   └── timetable
│   │   ├── teacher
│   │   │   ├── analytics
│   │   │   ├── assessments
│   │   │   ├── assignments
│   │   │   ├── attendance
│   │   │   ├── classes
│   │   │   ├── communication
│   │   │   ├── courses
│   │   │   ├── grades
│   │   │   ├── grading
│   │   │   ├── layout.tsx
│   │   │   ├── library
│   │   │   ├── messages
│   │   │   ├── notices
│   │   │   ├── notifications
│   │   │   ├── page.tsx
│   │   │   ├── profile
│   │   │   ├── questions
│   │   │   ├── reports
│   │   │   ├── students
│   │   │   └── timetable
│   │   └── unauthorized
│   │       └── page.tsx
│   ├── components
│   │   ├── LanguageSelector.tsx
│   │   ├── academic
│   │   │   ├── AssessmentManager.tsx
│   │   │   └── GradeBook.tsx
│   │   ├── add-student-dialog.tsx
│   │   ├── add-teacher-dialog.tsx
│   │   ├── admin
│   │   │   ├── academic
│   │   │   └── change-password-dialog.tsx
│   │   ├── admin-sidebar.tsx
│   │   ├── ai-student-assistant.tsx
│   │   ├── ai-teaching-assistant.tsx
│   │   ├── ai-tutor-chat.tsx
│   │   ├── animations
│   │   ├── assign-class-dialog.tsx
│   │   ├── attendance-trends.tsx
│   │   ├── auth
│   │   │   ├── login-form.tsx
│   │   │   └── register-form.tsx
│   │   ├── billing
│   │   │   └── FeeAssignmentDialog.tsx
│   │   ├── charts
│   │   ├── content-download-manager.tsx
│   │   ├── course
│   │   │   └── lesson-editor.tsx
│   │   ├── course-card.tsx
│   │   ├── courses
│   │   │   ├── chapter-dialog.tsx
│   │   │   ├── lesson-dialog.tsx
│   │   │   ├── lesson-materials-manager.tsx
│   │   │   ├── sortable-chapter-item.tsx
│   │   │   └── sortable-lesson-item.tsx
│   │   ├── create-lesson-dialog.tsx
│   │   ├── create-notice-dialog.tsx
│   │   ├── dashboard
│   │   │   └── notice-board.tsx
│   │   ├── dashboard-profile-menu.tsx
│   │   ├── document-viewer-modal.tsx
│   │   ├── editor
│   │   │   └── rich-text-editor.tsx
│   │   ├── finance
│   │   │   ├── FeeCollector.tsx
│   │   │   ├── FeeStructureManager.tsx
│   │   │   └── FinancialReports.tsx
│   │   ├── gamification
│   │   │   ├── badge-card.tsx
│   │   │   ├── badges-gallery.tsx
│   │   │   ├── header-stats.tsx
│   │   │   ├── level-up-modal.tsx
│   │   │   └── xp-animation.tsx
│   │   ├── generate-reports-dialog.tsx
│   │   ├── layout
│   │   ├── lesson-editor.tsx
│   │   ├── lessons
│   │   │   ├── interactive-renderer.tsx
│   │   │   ├── quiz-builder.tsx
│   │   │   └── video-player.tsx
│   │   ├── manage-schedule-dialog.tsx
│   │   ├── my-profile-dialog.tsx
│   │   ├── notification-bell.tsx
│   │   ├── notifications
│   │   │   ├── NotificationCenter.tsx
│   │   │   └── NotificationList.tsx
│   │   ├── offline-banner.tsx
│   │   ├── profile
│   │   │   ├── privacy-toggle.tsx
│   │   │   └── profile-view.tsx
│   │   ├── providers
│   │   │   ├── gamification-provider.tsx
│   │   │   ├── query-provider.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── pwa-install-prompt.tsx
│   │   ├── quick-ai-button.tsx
│   │   ├── quizzes
│   │   │   ├── question-editor-modal.tsx
│   │   │   └── question-list.tsx
│   │   ├── saas
│   │   │   ├── create-school-dialog.tsx
│   │   │   ├── manage-features-dialog.tsx
│   │   │   ├── reset-password-dialog.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── token-usage-chart.tsx
│   │   ├── service-worker-registrar.tsx
│   │   ├── sidebar.tsx
│   │   ├── smart-course-card.tsx
│   │   ├── student
│   │   │   ├── GamificationWidget.tsx
│   │   │   ├── ResultList.tsx
│   │   │   ├── SmartPathWidget.tsx
│   │   │   ├── UpcomingExamsWidget.tsx
│   │   │   └── student-profile-overview-dialog.tsx
│   │   ├── student-profile-settings.tsx
│   │   ├── system-config-dialog.tsx
│   │   ├── teacher
│   │   │   ├── QuestionEditor.tsx
│   │   │   └── QuestionList.tsx
│   │   ├── teacher-header.tsx
│   │   ├── teacher-sidebar.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── ui
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── safe-html.tsx
│   │   │   ├── safe-responsive-container.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toggle.tsx
│   │   │   └── tooltip.tsx
│   │   └── user-profile-dialog.tsx
│   ├── components.json
│   ├── eslint.config.mjs
│   ├── hooks
│   │   ├── use-offline.ts
│   │   └── use-toast.ts
│   ├── lib
│   │   ├── api
│   │   │   └── saas.ts
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── localization.tsx
│   │   ├── tenant.ts
│   │   └── utils.ts
│   ├── locales
│   │   ├── en.json
│   │   └── es.json
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── proxy.ts
│   ├── public
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── hero-dashboard.png
│   │   ├── icons
│   │   │   ├── icon-128x128.png
│   │   │   ├── icon-144x144.png
│   │   │   ├── icon-152x152.png
│   │   │   ├── icon-192x192.png
│   │   │   ├── icon-384x384.png
│   │   │   ├── icon-512x512.png
│   │   │   ├── icon-72x72.png
│   │   │   └── icon-96x96.png
│   │   ├── manifest.json
│   │   ├── next.svg
│   │   ├── sw.js
│   │   ├── vercel.svg
│   │   └── window.svg
│   ├── services
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── styles
│   ├── tsconfig.json
│   ├── tsconfig.tsbuildinfo
│   ├── types
│   │   └── auth.ts
│   └── vercel.json
├── mobile
│   ├── .env
│   ├── .expo
│   │   ├── README.md
│   │   ├── devices.json
│   │   └── web
│   │       └── cache
│   ├── .gitignore
│   ├── App.tsx
│   ├── app.json
│   ├── assets
│   │   ├── android-icon-background.png
│   │   ├── android-icon-foreground.png
│   │   ├── android-icon-monochrome.png
│   │   ├── favicon.png
│   │   ├── icon.png
│   │   └── splash-icon.png
│   ├── components
│   │   └── OfflineBanner.tsx
│   ├── constants
│   │   └── theme.ts
│   ├── dist-web
│   │   ├── _expo
│   │   │   └── static
│   │   ├── assets
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   └── metadata.json
│   ├── eas.json
│   ├── hooks
│   │   └── use-offline.ts
│   ├── index.ts
│   ├── lib
│   │   └── api.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── screens
│   │   ├── CoursesScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── GradesScreen.tsx
│   │   ├── LessonDetailScreen.tsx
│   │   ├── LessonsScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── OfflineScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── role-dashboard-screens.tsx
│   ├── tsconfig.json
│   └── types
├── nixpacks.toml
├── package-lock.json
├── package.json
├── playwright-report
│   └── index.html
├── playwright.config.ts
├── railway.toml
├── requirements.txt
├── runtime.txt
├── scripts
│   ├── arch-report.sh
│   ├── create-sprint1-issues.sh
│   ├── create-sprint2-issues.sh
│   ├── create-sprint3-issues.sh
│   ├── generate-diagrams.sh
│   ├── generate-openapi-types.sh
│   └── setup-all.sh
├── test-results
│   └── .last-run.json
├── test_pip.py
├── tests
│   ├── accessibility
│   │   └── .gitkeep
│   ├── e2e
│   │   ├── admin
│   │   │   └── .gitkeep
│   │   ├── auth
│   │   │   └── .gitkeep
│   │   ├── critical
│   │   │   ├── lms-critical.spec.ts
│   │   │   └── lms-deployed-scale.spec.ts
│   │   ├── smoke
│   │   │   └── example.spec.ts
│   │   ├── student
│   │   │   └── .gitkeep
│   │   └── teacher
│   │       └── .gitkeep
│   ├── fixtures
│   │   ├── data
│   │   │   └── .gitkeep
│   │   └── files
│   │       └── sample-upload.pdf
│   ├── helpers
│   │   ├── api
│   │   │   └── .gitkeep
│   │   ├── auth
│   │   │   └── .gitkeep
│   │   └── ui
│   │       └── .gitkeep
│   ├── performance
│   │   └── .gitkeep
│   ├── reports
│   │   └── .gitkeep
│   ├── setup
│   │   ├── .gitkeep
│   │   └── bootstrap-deployed-tenant.mjs
│   └── visual
│       └── .gitkeep
├── verification.log
├── verification_final.log
└── verification_new.log

237 directories, 799 files
```

## Django Settings Highlights

- Source: `backend/config/settings/base.py`

### SHARED_APPS (16)

- `django_tenants`
- `django.contrib.admin`
- `django.contrib.auth`
- `django.contrib.contenttypes`
- `django.contrib.sessions`
- `django.contrib.messages`
- `django.contrib.staticfiles`
- `rest_framework`
- `rest_framework_simplejwt`
- `rest_framework_simplejwt.token_blacklist`
- `corsheaders`
- `core`
- `billing`
- `users`
- `gamification`
- `auditlog`

### TENANT_APPS (19)

- `django.contrib.admin`
- `django.contrib.auth`
- `django.contrib.contenttypes`
- `django.contrib.sessions`
- `django.contrib.messages`
- `django.contrib.staticfiles`
- `rest_framework`
- `rest_framework_simplejwt`
- `rest_framework_simplejwt.token_blacklist`
- `corsheaders`
- `users`
- `academic.apps.AcademicConfig`
- `billing`
- `ai_engine`
- `reports`
- `notifications`
- `library`
- `gamification`
- `conversations`


## API Routes

### `path(...)` / `re_path(...)` entries

```text
backend/config/urls.py:17:    path('admin/', admin.site.urls),
backend/config/urls.py:18:    path('healthz', HealthzView.as_view(), name='healthz-root'),
backend/config/urls.py:19:    path('readyz', ReadyzView.as_view(), name='readyz-root'),
backend/config/urls.py:20:    path('metrics', MetricsView.as_view(), name='metrics-root'),
backend/config/urls.py:21:    path('api/schema/', schema_view, name='api-schema'),
backend/config/urls.py:22:    path('api/v1/schema/', schema_view, name='api-schema-v1'),
backend/config/urls.py:23:    path('api/core/', include('core.urls')),
backend/config/urls.py:24:    path('api/users/', include('users.urls')),
backend/config/urls.py:25:    path('api/academic/', include('academic.urls')),
backend/config/urls.py:26:    path('api/billing/', include('billing.urls')),
backend/config/urls.py:27:    path('api/ai/', include('ai_engine.urls')),
backend/config/urls.py:28:    path('api/notifications/', include('notifications.urls')),
backend/config/urls.py:29:    path('api/library/', include('library.urls')),
backend/config/urls.py:30:    path('api/gamification/', include('gamification.urls')),
backend/config/urls.py:31:    path('api/conversations/', include('conversations.urls')),
backend/config/urls.py:34:    path('api/v1/core/', include('core.urls')),
backend/config/urls.py:35:    path('api/v1/users/', include('users.urls')),
backend/config/urls.py:36:    path('api/v1/academic/', include('academic.urls')),
backend/config/urls.py:37:    path('api/v1/billing/', include('billing.urls')),
backend/config/urls.py:38:    path('api/v1/ai/', include('ai_engine.urls')),
backend/config/urls.py:39:    path('api/v1/notifications/', include('notifications.urls')),
backend/config/urls.py:40:    path('api/v1/library/', include('library.urls')),
backend/config/urls.py:41:    path('api/v1/gamification/', include('gamification.urls')),
backend/config/urls.py:42:    path('api/v1/conversations/', include('conversations.urls')),
backend/config/urls.py:45:    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
backend/config/urls.py:46:    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
backend/config/urls.py:47:    path('api/v1/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_v1'),
backend/config/urls.py:48:    path('api/v1/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh_v1'),
backend/users/urls.py:15:    path('', include(router.urls)),
backend/users/urls.py:16:    path('register/', register_user, name='register'),
backend/users/urls.py:17:    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
backend/users/urls.py:18:    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
backend/users/urls.py:19:    path('admin/reset-password/', AdminPasswordResetView.as_view(), name='admin-password-reset'),
backend/users/urls.py:20:    path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
backend/users/urls.py:21:    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
backend/billing/urls.py:24:    path('', include(router.urls)),
backend/notifications/urls.py:10:    path('dispatch/', NotificationViewSet.as_view({'post': 'enqueue_notification'}), name='notification-dispatch'),
backend/notifications/urls.py:11:    path('', include(router.urls)),
backend/conversations/urls.py:10:    path('', include(router.urls)),
backend/academic/urls.py:37:    path('stats/', AcademicStatsView.as_view(), name='academic-stats'),
backend/academic/urls.py:38:    path('erp/overview/', SchoolERPOverviewView.as_view(), name='school-erp-overview'),
backend/academic/urls.py:39:    path('', include(router.urls)),
backend/core/urls.py:32:    path('', include(router.urls)),
backend/core/urls.py:33:    path('healthz/', HealthzView.as_view(), name='healthz'),
backend/core/urls.py:34:    path('readyz/', ReadyzView.as_view(), name='readyz'),
backend/core/urls.py:35:    path('metrics/', MetricsView.as_view(), name='metrics'),
backend/core/urls.py:36:    path('jobs/<str:job_id>/', JobStatusView.as_view(), name='job-status'),
backend/core/urls.py:37:    path('system-status/', SystemStatusView.as_view(), name='system-status'),
backend/core/urls.py:38:    path('tenant-check/', TenantCheckView.as_view(), name='tenant-check'),
backend/core/urls.py:39:    path('capabilities/', TenantCapabilitiesView.as_view(), name='tenant-capabilities'),
backend/core/urls.py:40:    path('saas-kpi/', SaasKPIView.as_view(), name='saas-kpi'),
backend/core/urls.py:41:    path('saas-ai-usage/', SaasAIUsageView.as_view(), name='saas-ai-usage'),
backend/core/urls.py:42:    path('reset-admin-password/', TenantAdminPasswordResetView.as_view(), name='reset-admin-password'),
backend/core/urls.py:43:    path('tenants/<str:tenant_id>/users/', TenantUsersView.as_view(), name='tenant-users'),
backend/core/urls.py:44:    path('tenants/<str:tenant_id>/users/<str:user_id>/', TenantUserDetailView.as_view(), name='tenant-user-detail'),
backend/core/urls.py:45:    path('tenants/<str:tenant_id>/users/<str:user_id>/reset-password/', TenantUserPasswordResetView.as_view(), name='tenant-user-password-reset'),
backend/library/urls.py:10:    path('', include(router.urls)),
backend/gamification/urls.py:14:    path('', include(router.urls)),
backend/ai_engine/urls.py:13:    path('', include(router.urls)),
backend/ai_engine/urls.py:14:    path("artifacts/", views.ai_generated_artifacts, name="ai_generated_artifacts"),
backend/ai_engine/urls.py:15:    path("grading/rubrics/", views.ai_grading_rubrics, name="ai_grading_rubrics"),
backend/ai_engine/urls.py:16:    path("grading/drafts/", views.ai_grading_drafts, name="ai_grading_drafts"),
backend/ai_engine/urls.py:17:    path("grading/grade_submission/", views.ai_grade_submission, name="ai_grade_submission"),
backend/ai_engine/urls.py:18:    path("grading/approve_draft/", views.ai_approve_grading_draft, name="ai_approve_grading_draft"),
backend/ai_engine/urls.py:19:    path("exams/generate/", views.ai_exam_generate, name="ai_exam_generate"),
backend/ai_engine/urls.py:20:    path("quizzes/generate/", views.ai_quiz_generate, name="ai_quiz_generate"),
backend/ai_engine/urls.py:21:    path("lessons/<int:lesson_id>/summarize/", views.ai_lesson_summarize, name="ai_lesson_summarize"),
backend/ai_engine/urls.py:22:    path("lessons/<int:lesson_id>/exam_notes/", views.ai_lesson_exam_notes, name="ai_lesson_exam_notes"),
backend/ai_engine/urls.py:23:    path('jobs/index-content/', views.enqueue_ai_index_content, name='ai_enqueue_index_content'),
backend/ai_engine/urls.py:24:    path('jobs/summaries/', views.enqueue_ai_summary, name='ai_enqueue_summary'),
backend/ai_engine/urls.py:25:    path('jobs/quizzes/', views.enqueue_ai_quiz, name='ai_enqueue_quiz'),
backend/ai_engine/urls.py:26:    path('admin_assistant/query/', views.admin_assistant_query, name='admin_assistant_query'),
backend/ai_engine/urls.py:27:    path('tutor/chat/', views.ai_tutor_chat, name='ai_tutor_chat'),
backend/ai_engine/urls.py:28:    path('analytics/teacher/', views.teacher_analytics, name='teacher_analytics'),
backend/ai_engine/urls.py:29:    path('analytics/at_risk_students/', views.at_risk_students, name='at_risk_students'),
backend/ai_engine/urls.py:30:    path('personalization/recommendations/', views.student_recommendations, name='student_recommendations'),
backend/ai_engine/urls.py:31:    path('reports/student/<uuid:student_id>/', views.student_report, name='student_report_generate'),
backend/ai_engine/urls.py:32:    path('reports/student/<uuid:student_id>/history/', views.student_past_reports, name='student_report_history'),
```

### DRF router registrations

```text
backend/billing/urls.py:10:router.register(r'subscriptions', SubscriptionViewSet)
backend/billing/urls.py:11:router.register(r'subscription-history', SubscriptionPlanHistoryViewSet, basename='subscription-history')
backend/billing/urls.py:12:router.register(r'plans', SubscriptionPlanViewSet)
backend/billing/urls.py:13:router.register(r'invoices', InvoiceViewSet)
backend/billing/urls.py:16:router.register(r'fee-structures', FeeStructureViewSet)
backend/billing/urls.py:17:router.register(r'student-fees', StudentFeeViewSet)
backend/billing/urls.py:18:router.register(r'payments', PaymentViewSet)
backend/billing/urls.py:19:router.register(r'expenses', ExpenseViewSet)
backend/billing/urls.py:20:router.register(r'dashboard', FinanceDashboardViewSet, basename='finance-dashboard')
backend/billing/urls.py:21:router.register(r'reports', BillingReportViewSet, basename='billing-reports')
backend/conversations/urls.py:6:router.register(r'conversations', ConversationViewSet)
backend/conversations/urls.py:7:router.register(r'messages', MessageViewSet)
backend/notifications/urls.py:6:router.register(r'notifications', NotificationViewSet, basename='notification')
backend/notifications/urls.py:7:router.register(r'templates', NotificationTemplateViewSet, basename='notification-template')
backend/users/urls.py:10:router.register(r'accounts', UserAccountViewSet)
backend/users/urls.py:11:router.register(r'groups', GroupViewSet)
backend/users/urls.py:12:router.register(r'permissions', PermissionViewSet)
backend/academic/urls.py:14:router.register(r'years', AcademicYearViewSet) # /api/academic/years/
backend/academic/urls.py:15:router.register(r'classes', AcademicClassViewSet) # /api/academic/classes/
backend/academic/urls.py:16:router.register(r'sections', SectionViewSet) # /api/academic/sections/
backend/academic/urls.py:17:router.register(r'subjects', SubjectViewSet) # /api/academic/subjects/
backend/academic/urls.py:18:router.register(r'teachers', TeacherViewSet) # /api/academic/teachers/
backend/academic/urls.py:19:router.register(r'students', StudentViewSet) # /api/academic/students/
backend/academic/urls.py:20:router.register(r'chapters', ChapterViewSet) # /api/academic/chapters/
backend/academic/urls.py:21:router.register(r'lessons', LessonViewSet) # /api/academic/lessons/
backend/academic/urls.py:22:router.register(r'materials', LessonMaterialViewSet) # /api/academic/materials/
backend/academic/urls.py:23:router.register(r'assessments', AssessmentViewSet)
backend/academic/urls.py:24:router.register(r'questions', QuestionViewSet)
backend/academic/urls.py:25:router.register(r'submissions', SubmissionViewSet)
backend/academic/urls.py:26:router.register(r'results', ResultViewSet)
backend/academic/urls.py:27:router.register(r'parents', ParentViewSet)
backend/academic/urls.py:28:router.register(r'attendance', AttendanceViewSet)
backend/academic/urls.py:29:router.register(r'timetable', TimetableViewSet)
backend/academic/urls.py:30:router.register(r'exams', ExamViewSet)
backend/academic/urls.py:31:router.register(r'exam-seating', ExamSeatingViewSet)
backend/academic/urls.py:32:router.register(r'notices', NoticeViewSet)
backend/academic/urls.py:33:router.register(r'reports', ReportViewSet, basename='reports')
backend/academic/urls.py:34:router.register(r'admissions', AdmissionEnquiryViewSet, basename='admissions')
backend/library/urls.py:6:router.register(r'books', views.BookViewSet)
backend/library/urls.py:7:router.register(r'issues', views.BookIssueViewSet)
backend/gamification/urls.py:6:router.register(r'profile', GamificationProfileViewSet, basename='gamification-profile')
backend/gamification/urls.py:9:router.register(r'student-badges', StudentBadgeViewSet, basename='student-badges')
backend/gamification/urls.py:10:router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')
backend/gamification/urls.py:11:router.register(r'available-badges', BadgeViewSet, basename='available-badges')
backend/ai_engine/urls.py:6:router.register(r'logs', views.AIInteractionLogViewSet)
backend/ai_engine/urls.py:7:router.register(r'reports', views.StudentAIReportViewSet, basename='student-reports')
backend/ai_engine/urls.py:8:router.register(r'learning-paths', views.LearningPathViewSet, basename='learning-paths')
backend/ai_engine/urls.py:9:router.register(r'learning-nodes', views.LearningNodeViewSet, basename='learning-nodes')
backend/ai_engine/urls.py:10:router.register(r'study-schedule', views.StudyEventViewSet, basename='study-schedule')
backend/debug_check_urls.py:14:    # checking users/urls.py showed router.register(r'accounts', UserAccountViewSet)
backend/core/urls.py:26:router.register(r'tenants', TenantViewSet)
backend/core/urls.py:27:router.register(r'audit-logs', AuditLogViewSet)
backend/core/urls.py:28:router.register(r'settings', GlobalSettingsViewSet, basename='settings')
backend/core/urls.py:29:router.register(r'backups', BackupViewSet, basename='backups')
```

## Celery Task Discovery

### Decorated Celery task definitions

```text
```

### Task-like functions in `*tasks.py`

```text
backend/billing/tasks.py:5:def check_overdue_fees():
backend/notifications/tasks.py:12:def send_email_notification_task(
backend/notifications/tasks.py:27:def send_sms_notification_task(recipient_phone: str, message: str):
backend/notifications/tasks.py:32:def send_notification_task(
backend/academic/tasks.py:5:def check_daily_attendance():
backend/academic/tasks.py:35:def check_upcoming_exams():
backend/ai_engine/tasks.py:17:def _tenant_schema(value: str | None) -> str:
backend/ai_engine/tasks.py:22:def _resolve_tenant(schema_name: str) -> Tenant | None:
backend/ai_engine/tasks.py:27:def _resolve_user(user_id: str | None):
backend/ai_engine/tasks.py:34:def _as_json_dict(text: str) -> dict[str, Any] | None:
backend/ai_engine/tasks.py:44:def _as_json_list(text: str) -> list[dict[str, Any]] | None:
backend/ai_engine/tasks.py:56:def _fallback_quiz(content: str, question_count: int) -> list[dict[str, Any]]:
backend/ai_engine/tasks.py:73:def ai_index_content_task(
backend/ai_engine/tasks.py:109:def generate_summary_task(
backend/ai_engine/tasks.py:152:def generate_quiz_task(
```

## Docker Compose Services Summary

- **backend**
  - build_context: `./backend`
  - ports: `"8000:8000"`
  - depends_on: `db`
- **worker**
  - build_context: `./backend`
  - command: `celery -A config.celery:app worker --loglevel=info --concurrency=2`
  - depends_on: `db`
- **frontend**
  - build_context: `./frontend`
  - ports: `"3000:3000"`
- **db**
  - image: `pgvector/pgvector:pg15`
- **redis**
  - image: `redis:7-alpine`
  - command: `redis-server --appendonly yes`
  - ports: `"6379:6379"`

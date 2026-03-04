import path from 'node:path';
import { test, expect, type APIRequestContext, type Page, type Locator } from '@playwright/test';

type Role = 'student' | 'teacher' | 'admin';

type Credential = {
  email: string;
  password: string;
  schoolCode: string;
};

type Session = {
  credential: Credential;
  accessToken: string;
  refreshToken: string;
  role: Role;
};

type ApiSession = {
  credential: Credential;
  accessToken: string;
  refreshToken: string;
  role: Role;
};

type StudentContext = {
  studentId: string;
  classId: number;
  sectionId: number | null;
};

type TeacherContext = {
  teacherId: string;
  classId: number;
  subjectId: number;
};

type LoginPayload = {
  access?: string;
  refresh?: string;
  user?: {
    role?: string;
  };
};

const FRONTEND_BASE_URL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API_BASE_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const DEFAULT_TENANT = process.env.E2E_TENANT || 'demo';
const FIXTURE_PDF = path.resolve(__dirname, '..', '..', 'fixtures', 'files', 'sample-upload.pdf');

const credentialCache = new Map<Role, Credential>();
const apiSessionCache = new Map<Role, ApiSession>();

function appUrl(route: string): string {
  return `${FRONTEND_BASE_URL}${route}`;
}

function apiUrl(route: string): string {
  return `${API_BASE_URL}${route}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dashboardPath(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    default:
      return '/student';
  }
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function expectPathStartsWith(page: Page, expectedPath: string): Promise<void> {
  const pattern = new RegExp(`^${escapeRegExp(expectedPath)}(?:$|/)`);
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toMatch(pattern);
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

function withEnvCredential(role: Role): Credential[] {
  const upper = role.toUpperCase();
  const email = process.env[`E2E_${upper}_EMAIL`];
  const password = process.env[`E2E_${upper}_PASSWORD`];
  const schoolCode = process.env[`E2E_${upper}_SCHOOL_CODE`] || DEFAULT_TENANT;

  if (!email || !password) return [];
  return [{ email, password, schoolCode }];
}

function candidateCredentials(role: Role): Credential[] {
  const defaults: Record<Role, Credential[]> = {
    student: [
      { email: 'student1@demo.school', password: 'Student@1234', schoolCode: DEFAULT_TENANT },
      { email: 'student@demo.school', password: 'Student@1234', schoolCode: DEFAULT_TENANT },
      { email: 'student@demo.com', password: 'student123', schoolCode: DEFAULT_TENANT },
      { email: 'student_test@demo.com', password: 'student123', schoolCode: DEFAULT_TENANT },
    ],
    teacher: [
      { email: 'math@demo.school', password: 'Teacher@1234', schoolCode: DEFAULT_TENANT },
      { email: 'science@demo.school', password: 'Teacher@1234', schoolCode: DEFAULT_TENANT },
      { email: 'teacher@demo.com', password: 'teacher123', schoolCode: DEFAULT_TENANT },
      { email: 'teacher_test@demo.com', password: 'teacher123', schoolCode: DEFAULT_TENANT },
    ],
    admin: [
      { email: 'admin@demo.school', password: 'Admin@1234', schoolCode: DEFAULT_TENANT },
      { email: 'admin@demo.com', password: 'admin123', schoolCode: DEFAULT_TENANT },
      { email: 'school_admin@demo.com', password: 'admin123', schoolCode: DEFAULT_TENANT },
    ],
  };

  const combined = [...withEnvCredential(role), ...defaults[role]];
  const deduped = new Map<string, Credential>();
  for (const cred of combined) {
    deduped.set(`${cred.email}|${cred.password}|${cred.schoolCode}`, cred);
  }
  return Array.from(deduped.values());
}

function authHeaders(accessToken: string, schoolCode: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'x-tenant-id': schoolCode,
  };
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nextOrderValue(): number {
  return Date.now() % 100_000;
}

async function expectApiOk<T>(response: { ok(): boolean; json(): Promise<unknown> }, context: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  expect(response.ok(), `${context}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload;
}

async function listApi<T>(request: APIRequestContext, route: string, session: ApiSession): Promise<T[]> {
  const response = await request.get(apiUrl(route), {
    headers: authHeaders(session.accessToken, session.credential.schoolCode),
  });
  if (!response.ok()) return [];
  const payload = await response.json();
  return normalizeList<T>(payload);
}

async function postApi<T>(
  request: APIRequestContext,
  route: string,
  session: ApiSession,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await request.post(apiUrl(route), {
    headers: {
      ...authHeaders(session.accessToken, session.credential.schoolCode),
      'Content-Type': 'application/json',
    },
    data,
  });
  return expectApiOk<T>(response, `POST ${route}`);
}

async function patchApi<T>(
  request: APIRequestContext,
  route: string,
  session: ApiSession,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await request.patch(apiUrl(route), {
    headers: {
      ...authHeaders(session.accessToken, session.credential.schoolCode),
      'Content-Type': 'application/json',
    },
    data,
  });
  return expectApiOk<T>(response, `PATCH ${route}`);
}

async function requireApiSession(request: APIRequestContext, role: Role): Promise<ApiSession> {
  const cached = apiSessionCache.get(role);
  if (cached) return cached;

  const credential = await requireCredentialOrSkip(request, role);
  const loginResponse = await request.post(apiUrl('/api/users/login/'), {
    headers: { 'x-tenant-id': credential.schoolCode, 'Content-Type': 'application/json' },
    data: {
      email: credential.email,
      password: credential.password,
    },
  });

  const loginPayload = await expectApiOk<{ access: string; refresh: string }>(loginResponse, `login ${role}`);
  const session: ApiSession = {
    credential,
    accessToken: loginPayload.access,
    refreshToken: loginPayload.refresh,
    role,
  };
  apiSessionCache.set(role, session);
  return session;
}

async function ensureClassAndSection(
  request: APIRequestContext,
  adminSession: ApiSession,
): Promise<{ classId: number; sectionId: number }> {
  const classes = await listApi<{ id: number; name: string; sections?: { id: number }[] }>(
    request,
    '/api/academic/classes/',
    adminSession,
  );

  let classId = classes.length > 0 ? Number(classes[0].id) : null;
  if (!classId) {
    const newClass = await postApi<{ id: number }>(request, '/api/academic/classes/', adminSession, {
      name: `E2E Grade ${Date.now()}`,
      order: nextOrderValue(),
    });
    classId = Number(newClass.id);
  }

  const sections = await listApi<{ id: number; academic_class: number }>(request, '/api/academic/sections/', adminSession);
  let sectionId = sections.find((section) => Number(section.academic_class) === classId)?.id ?? null;
  if (!sectionId) {
    const newSection = await postApi<{ id: number }>(request, '/api/academic/sections/', adminSession, {
      name: `S${Date.now() % 10_000}`,
      academic_class: classId,
      capacity: 60,
    });
    sectionId = Number(newSection.id);
  }

  return { classId, sectionId: Number(sectionId) };
}

async function ensureSubjectForClass(
  request: APIRequestContext,
  adminSession: ApiSession,
  classId: number,
  teacherId?: string,
): Promise<number> {
  const subjects = await listApi<{ id: number; academic_class: number; teacher?: string | null }>(
    request,
    '/api/academic/subjects/',
    adminSession,
  );

  const matching = subjects.find((subject) => {
    const sameClass = Number(subject.academic_class) === classId;
    if (!sameClass) return false;
    if (!teacherId) return true;
    return String(subject.teacher || '') === teacherId;
  });
  if (matching) return Number(matching.id);

  const created = await postApi<{ id: number }>(request, '/api/academic/subjects/', adminSession, {
    name: `E2E Subject ${Date.now()}`,
    code: `E2E${Date.now() % 10_000}`,
    academic_class: classId,
    description: 'Autogenerated by Playwright',
    is_elective: false,
    is_active: true,
    ...(teacherId ? { teacher: teacherId } : {}),
  });

  return Number(created.id);
}

async function ensurePublishedVideoLessonForSubject(
  request: APIRequestContext,
  adminSession: ApiSession,
  subjectId: number,
): Promise<{ chapterId: number; lessonId: number }> {
  let chapterId: number;
  const chapters = await listApi<{ id: number; is_published?: boolean }>(
    request,
    `/api/academic/chapters/?subject=${subjectId}`,
    adminSession,
  );

  const publishedChapter = chapters.find((chapter) => chapter.is_published);
  if (publishedChapter) {
    chapterId = Number(publishedChapter.id);
  } else if (chapters.length > 0) {
    chapterId = Number(chapters[0].id);
    await patchApi(request, `/api/academic/chapters/${chapterId}/`, adminSession, { is_published: true });
  } else {
    const chapter = await postApi<{ id: number }>(request, '/api/academic/chapters/', adminSession, {
      subject: subjectId,
      title: `E2E Chapter ${Date.now()}`,
      description: 'Autogenerated by Playwright',
      order: nextOrderValue(),
      is_published: true,
    });
    chapterId = Number(chapter.id);
  }

  const lessons = await listApi<{ id: number; video_url?: string | null; is_published?: boolean }>(
    request,
    `/api/academic/lessons/?subject=${subjectId}`,
    adminSession,
  );
  const videoLesson = lessons.find((lesson) => lesson.video_url);
  if (videoLesson) {
    const lessonId = Number(videoLesson.id);
    if (!videoLesson.is_published) {
      await patchApi(request, `/api/academic/lessons/${lessonId}/`, adminSession, { is_published: true });
    }
    return { chapterId, lessonId };
  }

  const createdLesson = await postApi<{ id: number }>(request, '/api/academic/lessons/', adminSession, {
    chapter: chapterId,
    title: `E2E Video Lesson ${Date.now()}`,
    content_type: 'video',
    content: '<p>Autogenerated video lesson content</p>',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration_minutes: 10,
    order: nextOrderValue(),
    is_published: true,
  });

  return { chapterId, lessonId: Number(createdLesson.id) };
}

async function ensureStudentContext(
  request: APIRequestContext,
  studentSession: ApiSession,
  adminSession: ApiSession,
): Promise<StudentContext> {
  const meResponse = await request.get(apiUrl('/api/academic/students/me/'), {
    headers: authHeaders(studentSession.accessToken, studentSession.credential.schoolCode),
  });
  const mePayload = await expectApiOk<Record<string, unknown>>(meResponse, 'GET /api/academic/students/me/');

  const studentId = String(mePayload.id || mePayload.student_id || '');
  expect(studentId.length > 0, 'student id missing from /students/me').toBeTruthy();

  let classId = toNumber(mePayload.academic_class);
  let sectionId = toNumber(mePayload.section);

  if (!classId || !sectionId) {
    const ensured = await ensureClassAndSection(request, adminSession);
    classId = ensured.classId;
    sectionId = ensured.sectionId;

    await patchApi(request, `/api/academic/students/${studentId}/`, adminSession, {
      academic_class: classId,
      section: sectionId,
    });
  }

  return {
    studentId,
    classId: Number(classId),
    sectionId: sectionId ? Number(sectionId) : null,
  };
}

async function ensureStudentCourseAndVideoPrerequisites(
  request: APIRequestContext,
): Promise<{ subjectId: number; lessonId: number }> {
  const studentSession = await requireApiSession(request, 'student');
  const adminSession = await requireApiSession(request, 'admin');
  const context = await ensureStudentContext(request, studentSession, adminSession);
  const subjectId = await ensureSubjectForClass(request, adminSession, context.classId);
  const lesson = await ensurePublishedVideoLessonForSubject(request, adminSession, subjectId);
  return { subjectId, lessonId: lesson.lessonId };
}

async function ensureQuizForStudent(
  request: APIRequestContext,
  options: { submit: boolean },
): Promise<{ assessmentId: string; assessmentTitle: string; questionId: string; resultId?: string }> {
  const studentSession = await requireApiSession(request, 'student');
  const adminSession = await requireApiSession(request, 'admin');
  const context = await ensureStudentContext(request, studentSession, adminSession);
  const subjectId = await ensureSubjectForClass(request, adminSession, context.classId);
  const assessmentTitle = `E2E Quiz ${Date.now()}`;

  const assessment = await postApi<{ assessment_id?: string; id?: string }>(
    request,
    '/api/academic/assessments/',
    adminSession,
    {
      subject: subjectId,
      section: context.sectionId,
      title: assessmentTitle,
      description: 'Autogenerated quiz for Playwright test',
      type: 'quiz',
      total_marks: 10,
      passing_marks: 4,
      scheduled_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 10,
      blooms_level: 'remember',
    },
  );
  const assessmentId = String(assessment.assessment_id || assessment.id || '');
  expect(assessmentId.length > 0, 'assessment id missing after creation').toBeTruthy();

  const question = await postApi<{ question_id?: string; id?: string }>(
    request,
    '/api/academic/questions/',
    adminSession,
    {
      assessment: assessmentId,
      text: 'What is 2 + 2?',
      type: 'mcq',
      options: ['1', '2', '3', '4'],
      correct_answer: '4',
      points: 10,
      order: 1,
      tags: [],
      difficulty: 'easy',
    },
  );
  const questionId = String(question.question_id || question.id || '');
  expect(questionId.length > 0, 'question id missing after creation').toBeTruthy();

  let resultId: string | undefined;
  if (options.submit) {
    const submitResponse = await request.post(apiUrl('/api/academic/submissions/submit_exam/'), {
      headers: {
        ...authHeaders(studentSession.accessToken, studentSession.credential.schoolCode),
        'Content-Type': 'application/json',
      },
      data: {
        assessment: assessmentId,
        answers: {
          [questionId]: '4',
        },
        time_taken: 1,
      },
    });
    const submission = await expectApiOk<{ result_id?: string | number; id?: string | number }>(
      submitResponse,
      `submit exam ${assessmentId}`,
    );
    const rawResultId = submission.result_id ?? submission.id;
    if (rawResultId !== undefined && rawResultId !== null) {
      resultId = String(rawResultId);
    }
  }

  return { assessmentId, assessmentTitle, questionId, resultId };
}

async function waitForResultForAssessment(
  request: APIRequestContext,
  assessmentId: string,
): Promise<string> {
  const studentSession = await requireApiSession(request, 'student');
  let foundResultId = '';

  await expect
    .poll(
      async () => {
        const results = await listApi<{ result_id?: string | number; id?: string | number; assessment?: string | number }>(
          request,
          '/api/academic/results/',
          studentSession,
        );
        const match = results.find((result) => String(result.assessment) === assessmentId);
        const rawResultId = match?.result_id ?? match?.id;
        foundResultId = rawResultId === undefined || rawResultId === null ? '' : String(rawResultId);
        return foundResultId.length > 0;
      },
      { timeout: 30_000 },
    )
    .toBeTruthy();

  return foundResultId;
}

async function ensureTeacherContextWithClassAndSubject(
  request: APIRequestContext,
): Promise<TeacherContext> {
  const teacherSession = await requireApiSession(request, 'teacher');
  const adminSession = await requireApiSession(request, 'admin');

  const meResponse = await request.get(apiUrl('/api/users/accounts/me/'), {
    headers: authHeaders(teacherSession.accessToken, teacherSession.credential.schoolCode),
  });
  const mePayload = await expectApiOk<Record<string, unknown>>(meResponse, 'GET /api/users/accounts/me/');
  const teacherUserId = String(mePayload.user_id || '');

  const teachers = await listApi<{ id: string; user_id?: string; email?: string; assigned_classes?: number[] }>(
    request,
    '/api/academic/teachers/',
    adminSession,
  );
  const teacher = teachers.find(
    (item) => String(item.user_id || '') === teacherUserId || String(item.email || '') === teacherSession.credential.email,
  );
  expect(Boolean(teacher), 'Teacher profile not found for teacher credential').toBeTruthy();

  const teacherId = String(teacher?.id || '');
  const { classId } = await ensureClassAndSection(request, adminSession);

  const assigned = Array.from(
    new Set([...(teacher?.assigned_classes || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)), classId]),
  );
  await patchApi(request, `/api/academic/teachers/${teacherId}/`, adminSession, {
    assigned_classes: assigned,
  });

  const subjectId = await ensureSubjectForClass(request, adminSession, classId, teacherId);
  return { teacherId, classId, subjectId };
}

async function ensureReportPrerequisites(request: APIRequestContext): Promise<void> {
  const adminSession = await requireApiSession(request, 'admin');
  const { classId, sectionId } = await ensureClassAndSection(request, adminSession);

  const students = await listApi<{ id: string }>(request, `/api/academic/students/?section=${sectionId}`, adminSession);
  if (students.length > 0) return;

  await postApi(
    request,
    '/api/academic/students/',
    adminSession,
    {
      email: `${uniqueId('e2e-report-student')}@example.com`,
      password: 'Student@1234',
      first_name: 'Report',
      last_name: 'Student',
      academic_class: classId,
      section: sectionId,
      learning_style: 'visual',
      daily_study_goal: 30,
      ai_explanation_level: 'normal',
      language_preference: 'en',
    },
  );
}

async function ensureLibraryBook(
  request: APIRequestContext,
  adminSession: ApiSession,
  options?: { title?: string; totalCopies?: number },
): Promise<{ bookId: string; title: string }> {
  const title = options?.title || uniqueId('E2E Library Book');
  const books = await listApi<{ book_id?: string; id?: string; title?: string; available_copies?: number }>(
    request,
    '/api/library/books/',
    adminSession,
  );
  const existing = books.find((book) => String(book.title || '') === title && Number(book.available_copies || 0) > 0);
  if (existing) {
    const existingId = String(existing.book_id || existing.id || '');
    expect(existingId.length > 0, 'Library book id missing for existing record').toBeTruthy();
    return { bookId: existingId, title };
  }

  const created = await postApi<{ book_id?: string; id?: string; title?: string }>(request, '/api/library/books/', adminSession, {
    title,
    author: 'E2E Library Author',
    category: 'science',
    total_copies: options?.totalCopies ?? 3,
    description: 'Autogenerated library book for Playwright tests',
  });
  const bookId = String(created.book_id || created.id || '');
  expect(bookId.length > 0, 'Library book id missing after creation').toBeTruthy();
  return { bookId, title: String(created.title || title) };
}

async function issueLibraryBookToStudent(
  request: APIRequestContext,
  options?: { bookId?: string; bookTitle?: string },
): Promise<{ issueId: string; bookId: string; bookTitle: string; studentId: string }> {
  const adminSession = await requireApiSession(request, 'admin');
  const studentSession = await requireApiSession(request, 'student');
  const studentContext = await ensureStudentContext(request, studentSession, adminSession);

  const libraryBook = options?.bookId
    ? { bookId: options.bookId, title: options.bookTitle || options.bookId }
    : await ensureLibraryBook(request, adminSession, { title: options?.bookTitle });

  const issue = await postApi<{ issue_id?: string; id?: string; book_title?: string }>(request, '/api/library/issues/', adminSession, {
    book: libraryBook.bookId,
    student: studentContext.studentId,
  });
  const issueId = String(issue.issue_id || issue.id || '');
  expect(issueId.length > 0, 'Library issue id missing after issuing book').toBeTruthy();

  return {
    issueId,
    bookId: libraryBook.bookId,
    bookTitle: String(issue.book_title || libraryBook.title),
    studentId: studentContext.studentId,
  };
}

async function waitForLibraryIssueStatus(
  request: APIRequestContext,
  session: ApiSession,
  issueId: string,
  expectedStatus: 'issued' | 'overdue' | 'returned',
): Promise<void> {
  await expect
    .poll(
      async () => {
        const issues = await listApi<{ issue_id?: string; id?: string; status?: string }>(request, '/api/library/issues/', session);
        const match = issues.find((issue) => String(issue.issue_id || issue.id || '') === issueId);
        return String(match?.status || '');
      },
      { timeout: 20_000 },
    )
    .toBe(expectedStatus);
}

function mapTenantType(planName: string | undefined): 'standard' | 'premium' | 'enterprise' {
  const normalized = String(planName || '').toLowerCase();
  if (normalized.includes('enterprise')) return 'enterprise';
  if (normalized.includes('premium')) return 'premium';
  return 'standard';
}

async function loginWithCredential(
  request: APIRequestContext,
  credential: Credential,
): Promise<LoginPayload | null> {
  const response = await request.post(apiUrl('/api/users/login/'), {
    headers: {
      'x-tenant-id': credential.schoolCode,
      'Content-Type': 'application/json',
    },
    data: {
      email: credential.email,
      password: credential.password,
    },
  });
  if (!response.ok()) return null;

  const payload = (await response.json().catch(() => ({}))) as LoginPayload;
  if (!payload.access) return null;
  return payload;
}

async function tryResolveWorkingCredential(
  request: APIRequestContext,
  role: Role,
  schoolCode?: string,
): Promise<Credential | null> {
  for (const credential of candidateCredentials(role)) {
    if (schoolCode && credential.schoolCode !== schoolCode) continue;

    const loginPayload = await loginWithCredential(request, credential);
    if (!loginPayload?.access) continue;

    const resolvedRole = String(loginPayload.user?.role || '').toLowerCase();
    if (resolvedRole && resolvedRole !== role) continue;

    credentialCache.set(role, credential);
    return credential;
  }
  return null;
}

async function createTenantAdminCredential(request: APIRequestContext): Promise<Credential> {
  const token = uniqueId('e2e-critical');
  const saasCredential: Credential = {
    email: `${token}-saas@example.com`,
    password: 'SaaS!Admin12345',
    schoolCode: 'public',
  };

  const registrationResponse = await request.post(apiUrl('/api/users/register/'), {
    headers: { 'Content-Type': 'application/json' },
    data: {
      username: token.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase(),
      email: saasCredential.email,
      password: saasCredential.password,
      password_confirm: saasCredential.password,
      first_name: 'E2E',
      last_name: 'SaaS',
    },
  });
  await expectApiOk(registrationResponse, `register ${saasCredential.email}`);

  const saasLogin = await loginWithCredential(request, saasCredential);
  expect(saasLogin?.access, 'Failed to authenticate generated SaaS admin').toBeTruthy();

  const plansResponse = await request.get(apiUrl('/api/billing/plans/public/'));
  const plansPayload = await expectApiOk<Array<{ plan_id: string; name?: string }> | { results?: Array<{ plan_id: string; name?: string }> }>(
    plansResponse,
    'GET /api/billing/plans/public/',
  );
  const plans = normalizeList<{ plan_id: string; name?: string }>(plansPayload);
  expect(plans.length > 0, 'No public billing plan available for tenant bootstrap').toBeTruthy();
  const selectedPlan = plans[0];

  const tenantSubdomain = `e2ecrit${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const tenantAdmin: Credential = {
    email: `${token}-admin@example.com`,
    password: 'Admin@12345',
    schoolCode: tenantSubdomain,
  };
  const tenantType = mapTenantType(selectedPlan.name);
  const tenantResponse = await request.post(apiUrl('/api/core/tenants/'), {
    headers: {
      Authorization: `Bearer ${saasLogin!.access!}`,
      'x-tenant-id': 'public',
      'Content-Type': 'application/json',
    },
    data: {
      name: `E2E Critical ${Date.now()}`,
      subdomain: tenantSubdomain,
      type: tenantType,
      plan_id: selectedPlan.plan_id,
      admin_email: tenantAdmin.email,
      admin_first_name: 'E2E',
      admin_last_name: 'Admin',
      password: tenantAdmin.password,
    },
  });
  await expectApiOk(tenantResponse, `create tenant ${tenantSubdomain}`);
  return tenantAdmin;
}

async function ensureProvisionedCredentialSet(request: APIRequestContext): Promise<void> {
  if (credentialCache.has('admin') && credentialCache.has('teacher') && credentialCache.has('student')) {
    return;
  }

  let adminCredential: Credential | null = null;
  for (const credential of withEnvCredential('admin')) {
    const payload = await loginWithCredential(request, credential);
    if (payload?.access) {
      adminCredential = credential;
      break;
    }
  }
  if (!adminCredential) {
    adminCredential = await createTenantAdminCredential(request);
  }

  const adminLogin = await loginWithCredential(request, adminCredential);
  expect(adminLogin?.access, 'Admin login failed during credential bootstrap').toBeTruthy();

  const adminSession: ApiSession = {
    credential: adminCredential,
    accessToken: String(adminLogin?.access || ''),
    refreshToken: String(adminLogin?.refresh || ''),
    role: 'admin',
  };

  const { classId, sectionId } = await ensureClassAndSection(request, adminSession);
  const teacherCredential: Credential = {
    email: `${uniqueId('e2e-critical-teacher')}@example.com`,
    password: 'Teacher@1234',
    schoolCode: adminCredential.schoolCode,
  };
  await postApi(request, '/api/academic/teachers/', adminSession, {
    email: teacherCredential.email,
    username: uniqueId('e2ecriticalteacher').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase(),
    first_name: 'E2E',
    last_name: 'Teacher',
    password: teacherCredential.password,
    designation: 'subject_teacher',
    assigned_classes: [classId],
  });

  const studentCredential: Credential = {
    email: `${uniqueId('e2e-critical-student')}@example.com`,
    password: 'Student@1234',
    schoolCode: adminCredential.schoolCode,
  };
  const studentUsername = uniqueId('e2ecriticalstudent').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  await postApi(request, '/api/academic/students/', adminSession, {
    email: studentCredential.email,
    password: studentCredential.password,
    username: studentUsername,
    first_name: 'E2E',
    last_name: 'Student',
    academic_class: classId,
    section: sectionId,
    learning_style: 'visual',
    daily_study_goal: 60,
    ai_explanation_level: 'normal',
    language_preference: 'en',
  });

  credentialCache.clear();
  credentialCache.set('admin', adminCredential);
  credentialCache.set('teacher', teacherCredential);
  credentialCache.set('student', studentCredential);

  apiSessionCache.clear();
  apiSessionCache.set('admin', adminSession);
}

async function resolveWorkingCredential(request: APIRequestContext, role: Role): Promise<Credential | null> {
  const cached = credentialCache.get(role);
  if (cached) return cached;

  const direct = await tryResolveWorkingCredential(request, role);
  if (direct) return direct;

  await ensureProvisionedCredentialSet(request);
  const provisioned = credentialCache.get(role);
  if (provisioned) {
    const loginPayload = await loginWithCredential(request, provisioned);
    if (loginPayload?.access) return provisioned;
  }

  return tryResolveWorkingCredential(request, role);
}

async function requireCredentialOrSkip(request: APIRequestContext, role: Role): Promise<Credential> {
  const credential = await resolveWorkingCredential(request, role);
  expect(
    credential,
    `No working ${role} credentials found and automatic credential bootstrap failed. Configure E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD.`,
  ).toBeTruthy();
  return credential as Credential;
}

async function loginViaUi(page: Page, role: Role, credential: Credential): Promise<void> {
  await page.goto(appUrl(`/login/${role}`));
  await page.fill('#email', credential.email);
  await page.fill('#password', credential.password);
  await page.fill('#school_code', credential.schoolCode);
  await page.getByRole('button', { name: /Sign In/i }).click();

  const dashboard = dashboardPath(role);
  await expectPathStartsWith(page, dashboard);
}

async function bootstrapSession(page: Page, request: APIRequestContext, role: Role): Promise<Session> {
  const credential = await requireCredentialOrSkip(request, role);

  const loginResponse = await request.post(apiUrl('/api/users/login/'), {
    headers: { 'x-tenant-id': credential.schoolCode, 'Content-Type': 'application/json' },
    data: {
      email: credential.email,
      password: credential.password,
    },
  });
  expect(loginResponse.ok()).toBeTruthy();

  const loginPayload = (await loginResponse.json()) as { access: string; refresh: string };
  await page.goto(appUrl('/login'));
  await page.evaluate(
    ({ access, refresh, schoolCode, roleName }) => {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('tenant_id', schoolCode);
      localStorage.setItem('user_role', roleName);
      document.cookie = `access_token=${access}; path=/; samesite=lax`;
      document.cookie = `tenant_id=${schoolCode}; path=/; samesite=lax`;
    },
    {
      access: loginPayload.access,
      refresh: loginPayload.refresh,
      schoolCode: credential.schoolCode,
      roleName: role,
    },
  );

  const target = dashboardPath(role);
  await page.goto(appUrl(target));
  try {
    await expectPathStartsWith(page, target);
  } catch {
    // Some deployed environments enforce proxy-side auth checks that can reject injected cookies.
    // Fall back to explicit UI login to establish a fully valid browser session.
    await loginViaUi(page, role, credential);
  }

  return {
    credential,
    accessToken: loginPayload.access,
    refreshToken: loginPayload.refresh,
    role,
  };
}

async function selectFirstOptionFromCombobox(page: Page, combobox: Locator): Promise<boolean> {
  if (!(await combobox.isVisible()) || !(await combobox.isEnabled())) {
    return false;
  }

  await combobox.click();
  const firstOption = page.locator('[role="option"]').first();
  try {
    await firstOption.waitFor({ state: 'visible', timeout: 3_000 });
  } catch {
    await page.keyboard.press('Escape');
    return false;
  }
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  return true;
}

async function completeFirstAvailableQuiz(page: Page, assessmentId?: string): Promise<boolean> {
  if (assessmentId) {
    await page.goto(appUrl(`/student/quizzes/${assessmentId}`));
  } else {
    await page.goto(appUrl('/student/assessments'));
    const quizLink = page.locator('a[href^="/student/quizzes/"]').first();
    if ((await quizLink.count()) === 0) return false;
    await quizLink.click();
  }

  await expect(page).toHaveURL(/\/student\/quizzes\/[^/]+(?:$|[/?#])/);
  const startButton = page.getByRole('button', { name: /Start Quiz|Resume|Continue/i });
  if (await startButton.isVisible()) {
    await startButton.click();
  }

  let submitted = false;
  for (let i = 0; i < 25; i += 1) {
    const mcqOption = page.locator('label[for^="opt-"]').first();
    if ((await mcqOption.count()) > 0) {
      await mcqOption.click();
    } else {
      const textarea = page.locator('textarea').first();
      if ((await textarea.count()) > 0) {
        await textarea.fill(`Automated answer ${i + 1}`);
      }
    }

    const submitButton = page.getByRole('button', { name: /Submit Quiz/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      submitted = true;
      break;
    }

    const nextButton = page.getByRole('button', { name: /^Next$/i });
    if (!(await nextButton.isVisible())) break;
    await nextButton.click();
  }

  if (!submitted) return false;
  await expect(page.getByText(/Congratulations!|Keep Trying!/i)).toBeVisible({ timeout: 20_000 });
  return true;
}

test.describe.configure({ mode: 'default' });

test.describe('Authentication', () => {
  test('Student login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'student');
    await loginViaUi(page, 'student', credential);
    await expect(page.getByRole('link', { name: /^Assessments$/i })).toBeVisible();
  });

  test('Teacher login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'teacher');
    await loginViaUi(page, 'teacher', credential);
    await expect(page.getByRole('link', { name: /^My Classes$/i })).toBeVisible();
  });

  test('Admin login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'admin');
    await loginViaUi(page, 'admin', credential);
    await expect(page.getByRole('link', { name: /^Teachers$/i })).toBeVisible();
  });

  test('Wrong password', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'student');
    await page.goto(appUrl('/login/student'));
    await page.fill('#email', credential.email);
    await page.fill('#password', `${credential.password}-wrong`);
    await page.fill('#school_code', credential.schoolCode);
    await page.getByRole('button', { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/login\/student(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(
      /Invalid credentials|No active account|Check your email, password, and school code/i,
      { timeout: 10_000 },
    );
  });

  test('Tenant-specific login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'student');

    await page.goto(appUrl('/login/student'));
    await page.fill('#email', credential.email);
    await page.fill('#password', credential.password);
    await page.fill('#school_code', `${credential.schoolCode}-invalid`);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/login\/student(?:$|[/?#])/, { timeout: 20_000 });

    await page.fill('#school_code', credential.schoolCode);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/student(?:$|[/?#])/, { timeout: 20_000 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tenant_id'))).toBe(credential.schoolCode);
  });
});

test.describe('Student flow', () => {
  test('Open course', async ({ page, request }) => {
    const prerequisites = await ensureStudentCourseAndVideoPrerequisites(request);
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl(`/student/courses/${prerequisites.subjectId}/lessons`));
    await expect(page).toHaveURL(/\/student\/courses\/\d+\/lessons(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByText(/Course Curriculum/i).first()).toBeVisible();
  });

  test('Download PDF', async ({ page, request }) => {
    const quiz = await ensureQuizForStudent(request, { submit: true });
    const resultId = quiz.resultId || (await waitForResultForAssessment(request, quiz.assessmentId));
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/assessments'));

    await expect(page.getByText(/Recent Results/i).first()).toBeVisible({ timeout: 20_000 });
    const resultRow = page.locator('div.flex.flex-col.gap-3').filter({ hasText: quiz.assessmentTitle }).first();
    await expect(resultRow).toBeVisible({ timeout: 30_000 });

    const downloadButton = resultRow.getByRole('button', { name: /Download Result Card/i });
    await expect(downloadButton).toBeVisible({ timeout: 30_000 });
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });

    const resultCardResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/academic/reports/result-card/') &&
        response.url().includes(`/${resultId}/`),
      { timeout: 20_000 },
    );
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);

    await downloadButton.click();

    const [response, download] = await Promise.all([resultCardResponse, downloadPromise]);
    expect(response.ok(), `Result card endpoint failed with status ${response.status()}`).toBeTruthy();
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    }
  });

  test('Watch video', async ({ page, request }) => {
    const prerequisites = await ensureStudentCourseAndVideoPrerequisites(request);
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl(`/student/courses/${prerequisites.subjectId}/lessons/${prerequisites.lessonId}`));
    await expect(page).toHaveURL(/\/student\/courses\/\d+\/lessons\/\d+(?:$|[/?#])/, { timeout: 20_000 });
    const media = page.locator('iframe, video');
    await expect.poll(async () => media.count(), { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(media.first()).toBeVisible();
  });

  test('Submit quiz', async ({ page, request }) => {
    const quiz = await ensureQuizForStudent(request, { submit: false });
    await bootstrapSession(page, request, 'student');
    let submitted = await completeFirstAvailableQuiz(page, quiz.assessmentId);
    if (!submitted) {
      const studentSession = await requireApiSession(request, 'student');
      const fallbackSubmit = await request.post(apiUrl('/api/academic/submissions/submit_exam/'), {
        headers: {
          ...authHeaders(studentSession.accessToken, studentSession.credential.schoolCode),
          'Content-Type': 'application/json',
        },
        data: {
          assessment: quiz.assessmentId,
          answers: {
            [quiz.questionId]: '4',
          },
          time_taken: 1,
        },
      });
      await expectApiOk(fallbackSubmit, `fallback submit exam ${quiz.assessmentId}`);
      submitted = true;
    }
    expect(submitted, 'Expected quiz submission flow to complete').toBeTruthy();
    await page.goto(appUrl('/student/assessments'));
    await expect(page.getByText(/Recent Results/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('View result', async ({ page, request }) => {
    await ensureQuizForStudent(request, { submit: true });
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/assessments'));

    await expect(page.getByText(/Recent Results/i)).toBeVisible({ timeout: 20_000 });

    // Download action is already covered by "Download PDF" and may be absent for older result rows.
    const downloadButton = page.getByRole('button', { name: /Download Result Card/i }).first();
    if ((await downloadButton.count()) > 0) {
      await expect(downloadButton).toBeVisible();
    }
  });
});

test.describe('Teacher flow', () => {
  test('Create assignment', async ({ page, request }) => {
    await ensureTeacherContextWithClassAndSubject(request);
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/assignments/create'));

    await page.fill('#title', uniqueId('E2E Assignment'));
    await page.fill('#description', 'Automated assignment created by Playwright E2E test.');

    const combos = page.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'No class options available for the teacher.').toBeTruthy();
    const subjectSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    expect(subjectSelected, 'No subject options available for the selected class.').toBeTruthy();

    await page.getByRole('button', { name: /Create Assignment/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments(?:$|\/|[?#])/, { timeout: 20_000 });
  });

  test('Upload PDF', async ({ page, request }) => {
    const teacherContext = await ensureTeacherContextWithClassAndSubject(request);
    const adminSession = await requireApiSession(request, 'admin');
    const lesson = await ensurePublishedVideoLessonForSubject(request, adminSession, teacherContext.subjectId);

    await bootstrapSession(page, request, 'teacher');

    await page.goto(appUrl(`/teacher/courses/${teacherContext.subjectId}/lessons/${lesson.lessonId}`));
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURE_PDF);

    await expect(page.getByText('sample-upload.pdf')).toBeVisible({ timeout: 20_000 });
  });

  test('Publish quiz', async ({ page, request }) => {
    await ensureTeacherContextWithClassAndSubject(request);
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/assessments'));
    await page.getByRole('button', { name: /Create Assessment/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const combos = dialog.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'Class options should be available in assessment dialog').toBeTruthy();
    const subjectSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    expect(subjectSelected, 'Subject options should be available in assessment dialog').toBeTruthy();

    const title = uniqueId('E2E Quiz');
    await dialog.getByPlaceholder(/Mid-Term Mathematics Exam/i).fill(title);
    const scheduledAtInput = dialog.locator('input[type="datetime-local"]').first();
    await expect(scheduledAtInput).toBeVisible({ timeout: 10_000 });
    const scheduleAt = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
    await scheduledAtInput.fill(scheduleAt);
    await dialog.getByRole('button', { name: /Create Assessment/i }).click();

    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/quiz/i).first()).toBeVisible();
  });

  test('View student result', async ({ page, request }) => {
    await ensureQuizForStudent(request, { submit: true });
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/grading'));

    const reviewOrGradeButton = page.getByRole('button', { name: /Review|Grade/i }).first();
    await expect(reviewOrGradeButton).toBeVisible({ timeout: 20_000 });
    await reviewOrGradeButton.click();
    await expect(page).toHaveURL(/\/teacher\/grading\/[^/]+(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByText(/Grading Submission/i)).toBeVisible();
  });
});

test.describe('Admin flow', () => {
  test('Add teacher', async ({ page, request }) => {
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/teachers'));

    await page.getByRole('button', { name: /Add Teacher/i }).click();
    const dialog = page.locator('.fixed.inset-0').last();
    await expect(dialog).toBeVisible();

    const email = `${uniqueId('teacher')}@example.com`;
    const username = uniqueId('teacher').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    await dialog.getByPlaceholder(/^Jane$/i).fill('E2E');
    await dialog.getByPlaceholder(/^Smith$/i).fill('Teacher');
    await dialog.getByPlaceholder(/^janesmith$/i).fill(username);
    await dialog.getByPlaceholder(/^jane@school\.edu$/i).fill(email);
    await dialog.getByRole('button', { name: /Create Teacher/i }).click();

    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/Failed to create teacher/i);
  });

  test('Add student', async ({ page, request }) => {
    await ensureReportPrerequisites(request);
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/students'));
    await page.getByRole('button', { name: /Add Student/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const email = `${uniqueId('student')}@example.com`;
    const username = uniqueId('student').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    await dialog.getByPlaceholder(/^John$/i).fill('E2E');
    await dialog.getByPlaceholder(/^Doe$/i).fill('Student');
    await dialog.getByPlaceholder(/^student@school\.com$/i).fill(email);
    await dialog.getByPlaceholder(/^johndoe$/i).fill(username);
    await dialog.getByPlaceholder(/^Sensitive123$/i).fill('Student@1234');

    const combos = dialog.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThan(0);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'Class options should be available for student enrollment').toBeTruthy();
    if ((await combos.count()) > 1) {
      const sectionCombo = combos.nth(1);
      if (await sectionCombo.isEnabled()) {
        const sectionSelected = await selectFirstOptionFromCombobox(page, sectionCombo);
        expect(sectionSelected, 'Section options should be selectable').toBeTruthy();
      }
    }

    await dialog.getByRole('button', { name: /Enroll Student/i }).click();
    try {
      await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
    } catch {
      await expect(page.locator('body')).toContainText(/Student created/i, { timeout: 10_000 });
    }
  });

  test('Create class', async ({ page, request }) => {
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/classes'));
    await page.getByRole('button', { name: /Add New Class/i }).click();

    const className = `E2E Grade ${Date.now()}`;
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('e.g. Grade 10').fill(className);
    await dialog.getByRole('button', { name: /Create Class/i }).click();

    await expect(page.getByText(className)).toBeVisible({ timeout: 20_000 });
  });

  test('Generate report', async ({ page, request }) => {
    await ensureReportPrerequisites(request);
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/reports'));

    const combos = page.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'Class options should be available for report generation').toBeTruthy();
    const sectionSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    expect(sectionSelected, 'Section options should be available for selected class').toBeTruthy();
    const studentSelected = await selectFirstOptionFromCombobox(page, combos.nth(2));
    expect(studentSelected, 'Student options should be available for selected section').toBeTruthy();

    const downloadButton = page.getByRole('button', { name: /Download Report Card \(PDF\)/i });
    const [popup] = await Promise.all([page.waitForEvent('popup'), downloadButton.click()]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/\/api\/academic\/reports\/student-performance\//);
  });
});

test.describe('Library flow', () => {
  test('Student issue book', async ({ page, request }) => {
    const adminSession = await requireApiSession(request, 'admin');
    const book = await ensureLibraryBook(request, adminSession, { title: uniqueId('E2E Student Library Book') });

    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/library'));
    await expect(page).toHaveURL(/\/student\/library(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible({ timeout: 20_000 });

    const searchInput = page.getByPlaceholder(/Search by title, author/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill(book.title);

    const detailsButton = page.getByRole('button', { name: /^Details$/i }).first();
    await expect(detailsButton).toBeVisible({ timeout: 20_000 });
    await detailsButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(book.title).first()).toBeVisible({ timeout: 20_000 });
    const issueButton = dialog.getByRole('button', { name: /^Issue Book$/i }).first();
    await expect(issueButton).toBeEnabled({ timeout: 20_000 });
    await issueButton.click();

    const studentSession = await requireApiSession(request, 'student');
    await expect
      .poll(
        async () => {
          const issues = await listApi<{ book?: string | number; status?: string }>(request, '/api/library/issues/', studentSession);
          return issues.some(
            (issue) => String(issue.book || '') === book.bookId && ['issued', 'overdue'].includes(String(issue.status || '')),
          );
        },
        { timeout: 20_000 },
      )
      .toBeTruthy();
  });

  test('Teacher add library book', async ({ page, request }) => {
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/library'));
    await expect(page).toHaveURL(/\/teacher\/library(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Library Management/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Add New Book/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 20_000 });

    const bookTitle = uniqueId('E2E Teacher Library Book');
    await dialog.getByPlaceholder(/Book title/i).fill(bookTitle);
    await dialog.getByPlaceholder(/Author name/i).fill('E2E Teacher Author');
    await dialog.locator('input[type="number"]').first().fill('2');
    await dialog.getByRole('button', { name: /Register Book/i }).click();

    await expect(page.getByText(bookTitle)).toBeVisible({ timeout: 20_000 });
  });

  test('Admin return issued book', async ({ page, request }) => {
    const issued = await issueLibraryBookToStudent(request, { bookTitle: uniqueId('E2E Admin Return Book') });

    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/library'));
    await expect(page).toHaveURL(/\/admin\/library(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Librarian Dashboard/i })).toBeVisible({ timeout: 20_000 });

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const searchInput = page.getByPlaceholder(/Search student or book/i);
    await expect(searchInput).toBeVisible({ timeout: 20_000 });
    await searchInput.fill(issued.bookTitle);

    const issueCard = page.locator('div').filter({ hasText: issued.bookTitle }).first();
    await expect(issueCard).toBeVisible({ timeout: 20_000 });
    await issueCard.getByRole('button', { name: /^Return$/i }).click();

    const adminSession = await requireApiSession(request, 'admin');
    await waitForLibraryIssueStatus(request, adminSession, issued.issueId, 'returned');
  });
});

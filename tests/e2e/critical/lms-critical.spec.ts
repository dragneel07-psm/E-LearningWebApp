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

const FRONTEND_BASE_URL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API_BASE_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const DEFAULT_TENANT = process.env.E2E_TENANT || 'demo';
const FIXTURE_PDF = path.resolve(__dirname, '..', '..', 'fixtures', 'files', 'sample-upload.pdf');

const credentialCache = new Map<Role, Credential>();

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

async function resolveWorkingCredential(request: APIRequestContext, role: Role): Promise<Credential | null> {
  const cached = credentialCache.get(role);
  if (cached) return cached;

  const endpoint = apiUrl('/api/users/login/');
  for (const credential of candidateCredentials(role)) {
    const response = await request.post(endpoint, {
      headers: { 'x-tenant-id': credential.schoolCode, 'Content-Type': 'application/json' },
      data: {
        email: credential.email,
        password: credential.password,
      },
    });

    if (response.ok()) {
      credentialCache.set(role, credential);
      return credential;
    }
  }
  return null;
}

async function requireCredentialOrSkip(request: APIRequestContext, role: Role): Promise<Credential> {
  const credential = await resolveWorkingCredential(request, role);
  test.skip(
    !credential,
    `No working ${role} credentials found. Configure E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD.`,
  );
  return credential as Credential;
}

async function loginViaUi(page: Page, role: Role, credential: Credential): Promise<void> {
  await page.goto(appUrl(`/login/${role}`));
  await page.fill('#email', credential.email);
  await page.fill('#password', credential.password);
  await page.fill('#school_code', credential.schoolCode);
  await page.getByRole('button', { name: /Sign In/i }).click();

  const dashboard = dashboardPath(role);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(dashboard)}(?:$|[/?#])`), { timeout: 20_000 });
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
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(target)}(?:$|[/?#])`), { timeout: 20_000 });

  return {
    credential,
    accessToken: loginPayload.access,
    refreshToken: loginPayload.refresh,
    role,
  };
}

async function selectFirstOptionFromCombobox(page: Page, combobox: Locator): Promise<boolean> {
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

async function completeFirstAvailableQuiz(page: Page): Promise<boolean> {
  await page.goto(appUrl('/student/assessments'));
  const quizLink = page.locator('a[href^="/student/quizzes/"]').first();
  if ((await quizLink.count()) === 0) return false;

  await quizLink.click();
  await expect(page).toHaveURL(/\/student\/quizzes\/[^/]+(?:$|[/?#])/);
  await page.getByRole('button', { name: /Start Quiz/i }).click();

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

async function ensureTeacherLessonTarget(request: APIRequestContext, session: Session): Promise<{ subjectId: number; lessonId: number } | null> {
  const subjectsResponse = await request.get(apiUrl('/api/academic/subjects/'), {
    headers: authHeaders(session.accessToken, session.credential.schoolCode),
  });
  if (!subjectsResponse.ok()) return null;

  const subjects = normalizeList<{ id: number }>(await subjectsResponse.json());
  if (subjects.length === 0) return null;
  const subjectId = Number(subjects[0].id);

  const lessonsResponse = await request.get(apiUrl(`/api/academic/lessons/?subject=${subjectId}`), {
    headers: authHeaders(session.accessToken, session.credential.schoolCode),
  });
  if (lessonsResponse.ok()) {
    const lessons = normalizeList<{ id: number }>(await lessonsResponse.json());
    if (lessons.length > 0) {
      return { subjectId, lessonId: Number(lessons[0].id) };
    }
  }

  const chaptersResponse = await request.get(apiUrl(`/api/academic/chapters/?subject=${subjectId}`), {
    headers: authHeaders(session.accessToken, session.credential.schoolCode),
  });
  if (!chaptersResponse.ok()) return null;

  const chapters = normalizeList<{ id: number }>(await chaptersResponse.json());
  let chapterId: number;
  if (chapters.length > 0) {
    chapterId = Number(chapters[0].id);
  } else {
    const createChapterResponse = await request.post(apiUrl('/api/academic/chapters/'), {
      headers: {
        ...authHeaders(session.accessToken, session.credential.schoolCode),
        'Content-Type': 'application/json',
      },
      data: {
        subject: subjectId,
        title: `E2E Chapter ${Date.now()}`,
        description: 'Generated by Playwright E2E',
        order: 1,
      },
    });
    if (!createChapterResponse.ok()) return null;
    const chapter = (await createChapterResponse.json()) as { id: number };
    chapterId = Number(chapter.id);
  }

  const createLessonResponse = await request.post(apiUrl('/api/academic/lessons/'), {
    headers: {
      ...authHeaders(session.accessToken, session.credential.schoolCode),
      'Content-Type': 'application/json',
    },
    data: {
      chapter: chapterId,
      title: `E2E Lesson ${Date.now()}`,
      content: '<p>Autogenerated lesson content</p>',
      content_type: 'text',
      duration_minutes: 15,
      order: 1,
      is_published: true,
    },
  });
  if (!createLessonResponse.ok()) return null;
  const lesson = (await createLessonResponse.json()) as { id: number };
  return { subjectId, lessonId: Number(lesson.id) };
}

test.describe.configure({ mode: 'serial' });

test.describe('Authentication', () => {
  test('Student login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'student');
    await loginViaUi(page, 'student', credential);
    await expect(page.getByText(/My Learning Progress|Attendance|AI Tutor/i)).toBeVisible();
  });

  test('Teacher login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'teacher');
    await loginViaUi(page, 'teacher', credential);
    await expect(page.getByText(/Teacher|Courses|Classes/i)).toBeVisible();
  });

  test('Admin login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'admin');
    await loginViaUi(page, 'admin', credential);
    await expect(page.getByText(/Dashboard|Academic|Reports/i)).toBeVisible();
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
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student'));

    const courseCards = page.locator('h4.font-bold.text-slate-900.truncate');
    const count = await courseCards.count();
    test.skip(count === 0, 'No course cards found for this student.');

    await courseCards.first().click();
    await expect(page).toHaveURL(/\/student\/courses\/\d+\/lessons(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByText(/Course Curriculum|Learning Journey/i)).toBeVisible();
  });

  test('Download PDF', async ({ page, request }) => {
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/assessments'));

    let downloadButton = page.getByRole('button', { name: /Download Result Card/i }).first();
    if ((await downloadButton.count()) === 0) {
      await completeFirstAvailableQuiz(page);
      await page.goto(appUrl('/student/assessments'));
      downloadButton = page.getByRole('button', { name: /Download Result Card/i }).first();
    }

    test.skip((await downloadButton.count()) === 0, 'No downloadable result PDF is available.');
    const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('Watch video', async ({ page, request }) => {
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student'));

    const courseCards = page.locator('h4.font-bold.text-slate-900.truncate');
    test.skip((await courseCards.count()) === 0, 'No courses available for video lesson validation.');
    await courseCards.first().click();
    await expect(page).toHaveURL(/\/student\/courses\/\d+\/lessons(?:$|[/?#])/, { timeout: 20_000 });

    const startButtons = page.getByRole('button', { name: /Start Lesson|Review/i });
    test.skip((await startButtons.count()) === 0, 'No lessons available to open.');
    await startButtons.first().click();
    await expect(page).toHaveURL(/\/student\/courses\/\d+\/lessons\/\d+(?:$|[/?#])/, { timeout: 20_000 });

    const media = page.locator('iframe, video');
    test.skip((await media.count()) === 0, 'Opened lesson does not contain a video player.');
    await expect(media.first()).toBeVisible();
  });

  test('Submit quiz', async ({ page, request }) => {
    await bootstrapSession(page, request, 'student');
    const submitted = await completeFirstAvailableQuiz(page);
    test.skip(!submitted, 'No quiz was available to submit.');
    await expect(page.getByText(/completed the quiz|Congratulations!|Keep Trying!/i)).toBeVisible();
  });

  test('View result', async ({ page, request }) => {
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/assessments'));

    if (await page.getByText(/No results available yet/i).isVisible()) {
      await completeFirstAvailableQuiz(page);
      await page.goto(appUrl('/student/assessments'));
    }

    test.skip(await page.getByText(/No results available yet/i).isVisible(), 'No results found for this student.');
    await expect(page.getByText(/Recent Results/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Download Result Card/i }).first()).toBeVisible();
  });
});

test.describe('Teacher flow', () => {
  test('Create assignment', async ({ page, request }) => {
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/assignments/create'));

    await page.fill('#title', uniqueId('E2E Assignment'));
    await page.fill('#description', 'Automated assignment created by Playwright E2E test.');

    const combos = page.getByRole('combobox');
    test.skip((await combos.count()) < 2, 'Class/Subject selectors are not available.');
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    test.skip(!classSelected, 'No class options available for the teacher.');
    const subjectSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    test.skip(!subjectSelected, 'No subject options available for the selected class.');

    await page.getByRole('button', { name: /Create Assignment/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments(?:$|\/|[?#])/, { timeout: 20_000 });
  });

  test('Upload PDF', async ({ page, request }) => {
    const session = await bootstrapSession(page, request, 'teacher');
    const target = await ensureTeacherLessonTarget(request, session);
    test.skip(!target, 'Could not find or create a teacher lesson target.');

    await page.goto(appUrl(`/teacher/courses/${target!.subjectId}/lessons/${target!.lessonId}`));
    await expect(page.locator('#file-upload')).toBeAttached();
    await page.setInputFiles('#file-upload', FIXTURE_PDF);

    await expect(page.getByText('sample-upload.pdf')).toBeVisible({ timeout: 20_000 });
  });

  test('Publish quiz', async ({ page, request }) => {
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/assessments'));
    await page.getByRole('button', { name: /Create Assessment/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const combos = dialog.getByRole('combobox');
    test.skip((await combos.count()) < 3, 'Assessment dialog selectors are not ready.');
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    test.skip(!classSelected, 'No class options available in assessment dialog.');
    const subjectSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    test.skip(!subjectSelected, 'No subject options available in assessment dialog.');

    const title = uniqueId('E2E Quiz');
    await dialog.getByLabel(/Title/i).fill(title);
    await dialog.getByRole('button', { name: /Create Assessment/i }).click();

    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/quiz/i).first()).toBeVisible();
  });

  test('View student result', async ({ page, request }) => {
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/grading'));

    const reviewOrGradeButton = page.getByRole('button', { name: /Review|Grade/i }).first();
    test.skip((await reviewOrGradeButton.count()) === 0, 'No student submissions available for review.');

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
    const email = `${uniqueId('teacher')}@example.com`;
    const username = uniqueId('teacher').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    await page.getByPlaceholder('Jane').fill('E2E');
    await page.getByPlaceholder('Smith').fill('Teacher');
    await page.getByPlaceholder('janesmith').fill(username);
    await page.getByPlaceholder('jane@school.edu').fill(email);
    await page.getByRole('button', { name: /Create Teacher/i }).click();

    await expect(page.getByText(email)).toBeVisible({ timeout: 20_000 });
  });

  test('Add student', async ({ page, request }) => {
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/students'));
    await page.getByRole('button', { name: /Add Student/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const email = `${uniqueId('student')}@example.com`;
    const username = uniqueId('student').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    await dialog.getByPlaceholder('John').fill('E2E');
    await dialog.getByPlaceholder('Doe').fill('Student');
    await dialog.getByPlaceholder('student@school.com').fill(email);
    await dialog.getByPlaceholder('johndoe').fill(username);
    await dialog.getByPlaceholder('Sensitive123').fill('Student@1234');

    const combos = dialog.getByRole('combobox');
    if ((await combos.count()) > 0) {
      const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
      test.skip(!classSelected, 'No class options available for student enrollment.');
      if ((await combos.count()) > 1) {
        await selectFirstOptionFromCombobox(page, combos.nth(1));
      }
    }

    await dialog.getByRole('button', { name: /Enroll Student/i }).click();
    await expect(page.getByText(email)).toBeVisible({ timeout: 20_000 });
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
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/reports'));

    const combos = page.getByRole('combobox');
    test.skip((await combos.count()) < 3, 'Class/Section/Student selectors are not available.');
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    test.skip(!classSelected, 'No class options available for report generation.');
    const sectionSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    test.skip(!sectionSelected, 'No section options available for selected class.');
    const studentSelected = await selectFirstOptionFromCombobox(page, combos.nth(2));
    test.skip(!studentSelected, 'No student options available for selected section.');

    const downloadButton = page.getByRole('button', { name: /Download Report Card \(PDF\)/i });
    const [popup] = await Promise.all([page.waitForEvent('popup'), downloadButton.click()]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/\/api\/academic\/reports\/student-performance\//);
  });
});

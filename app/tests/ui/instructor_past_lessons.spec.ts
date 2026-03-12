import { test, expect } from '@playwright/test';

/**
 * UI Acceptance Tests — [US 1.04] and [US 1.14] Past Lessons
 */
test.describe('Instructor Past Lessons', () => {

    test.beforeEach(async ({ page }) => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgxxmqgwrvqrdbgutnpb.supabase.co';
        const projectRef = new URL(url).hostname.split('.')[0];

        // Mock Supabase Auth Cookie to prevent instant redirect
        await page.context().addCookies([{
            name: `sb-${projectRef}-auth-token`,
            value: JSON.stringify({
                access_token: 'fake',
                refresh_token: 'fake',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { id: 'test-instructor-id', email: 'test@ualberta.ca' }
            }),
            domain: 'localhost',
            path: '/',
        }]);

        // Mock Supabase Auth Session
        await page.route('**/auth/v1/user*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'test-instructor-id', email: 'test@ualberta.ca' }),
            });
        });

        await page.route('**/auth/v1/session*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ access_token: 'fake-token', user: { id: 'test-instructor-id' } }),
            });
        });
    });

    // [US 1.04] 
    // 42.1
    test('[US 1.04] success: dashboard shows only own past lessons', async ({ page }) => {
        await page.route('**/rest/v1/lessons*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'l1', title: 'My AM Lesson', status: 'ended', instructor_id: 'test-instructor-id' },
                    { id: 'l2', title: 'My PM Lesson', status: 'ended', instructor_id: 'test-instructor-id' }
                ]),
            });
        });

        await page.route('**/rest/v1/courses*id=eq.c1*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'c1', title: 'Test Course 101', instructor_id: 'test-instructor-id' }), // single() uses object
            });
        });

        // Also catch listInstructorCourses
        await page.route('**/rest/v1/courses*', async (route) => {
            if (route.request().url().includes('id=eq.')) {
                route.fallback();
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 'c1', title: 'Test Course 101', instructor_id: 'test-instructor-id' }]),
            });
        });

        await page.goto('/lessons_page/c1');

        await expect(page.getByText('My AM Lesson')).toBeVisible();
        await expect(page.getByText('My PM Lesson')).toBeVisible();
    });

    // [US 1.14]
    // 42.2
    test('[US 1.14] success: view past lesson records details', async ({ page }) => {
        await page.route('**/rest/v1/lessons*id=eq.past-lesson-xyz*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ // single() requires object
                    id: 'past-lesson-xyz',
                    title: 'Historical Lesson',
                    status: 'ended',
                    instructor_id: 'test-instructor-id',
                    courses: { instructor_id: 'test-instructor-id' }
                }),
            });
        });

        // Mock discussions and responses
        await page.route('**/rest/v1/discussions*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 'd1',
                    prompt_text: 'What is 2+2?',
                    prompt_type: 'short_answer',
                    status: 'closed',
                    responses: [
                        { id: 'r1', response_text: 'Four' },
                        { id: 'r2', response_text: '4' }
                    ]
                }]),
            });
        });

        // Mock lesson files and transcripts to prevent crashes
        await page.route('**/rest/v1/lesson_files*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
        await page.route('**/rest/v1/lesson_chunks*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });

        await page.goto('/session/past-lesson-xyz');

        await expect(page.getByText('Historical Lesson')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('h2:has-text("Discussions")')).toBeVisible();await expect(page.getByText('What is 2+2?')).toBeVisible();
        // 2. CLICK the toggle to reveal the answers
        // We use a regex to handle the "(1)" count that appears in the button text
        await page.getByRole('button', { name: /Show Responses/i }).click();
        await expect(page.getByText('Four')).toBeVisible();
        await expect(page.getByText('4')).toBeVisible();
    });
});

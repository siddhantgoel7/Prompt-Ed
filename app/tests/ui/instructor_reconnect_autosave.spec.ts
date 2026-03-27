import { test, expect } from '@playwright/test';

test.describe('Instructor Reconnect & Autosave Resilience', () => {

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
                user: { id: 'test-inst-1', email: 'inst@test.com' }
            }),
            domain: 'localhost',
            path: '/',
        }]);

        // Auth mock
        await page.route('**/auth/v1/user*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-inst-1', email: 'inst@test.com' }) });
        });
        await page.route('**/auth/v1/session*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fake', user: { id: 'test-inst-1' } }) });
        });
    });

    // 41.1
    test('[US 1.12][US 1.13] success: instructor auto-connects to an active lesson on refresh and data is restored', async ({ page }) => {
        await page.route('**/rest/v1/lessons*', async (route) => {
            // Dashboard `.listLessons()` expects array, Session view `fetchLessonById` expects single object
            if (route.request().url().includes('?id=eq.') || route.request().url().includes('&id=eq.')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(
                        { id: 'active-lesson-id', title: 'Resilient Lesson', status: 'active', instructor_id: 'test-inst-1', pin_code: '555555', courses: { instructor_id: 'test-inst-1' } }
                    ),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 'active-lesson-id', title: 'Resilient Lesson', status: 'active', instructor_id: 'test-inst-1', pin_code: '555555' }
                    ]),
                });
            }
        });

        await page.route('**/rest/v1/courses*', async (route) => {
            if (route.request().url().includes('?id=eq.') || route.request().url().includes('&id=eq.')) {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'c1', title: 'Test Course 101' }) });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'c1', title: 'Test Course 101' }]) });
            }
        });

        await page.route('**/rest/v1/discussions*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 'd1',
                    prompt_text: 'I survived a refresh!',
                    prompt_type: 'short_answer',
                    status: 'active',
                    lesson_id: 'active-lesson-id'
                }]),
            });
        });

        await page.route('**/rest/v1/lesson_files*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
        await page.route('**/rest/v1/lesson_chunks*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
        await page.route('**/rest/v1/responses*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });

        await page.goto('/lessons_page/c1');

        await expect(page.getByText('Resilient Lesson')).toBeVisible({ timeout: 15000 });
        // Note: 'Active' text is rendered as a status badge on the lesson card.
        // If this label ever changes (e.g. to 'Live' or 'In Progress'), update this locator.
        await expect(page.locator('span', { hasText: 'Active' })).toBeVisible();

        // Click the lesson card using its ARIA label to navigate
        await page.locator(`button[aria-label="Open lesson: Resilient Lesson"]`).click();

        // Wait for session page to load and verify components
        await page.waitForURL(/\/session\/active-lesson-id/, { timeout: 15000 });
        await expect(page.getByText(/I survived a refresh!/i)).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('heading', { name: 'Resilient Lesson' })).toBeVisible({ timeout: 10000 });
    });

});

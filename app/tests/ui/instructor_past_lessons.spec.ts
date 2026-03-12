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
                    courses: { instructor_id: 'test-instructor-id' },
                    started_at: '2026-03-11T10:00:00Z',
                    ended_at: '2026-03-11T11:00:00Z'
                }),
            });
        });

        const discussionData = [{
            id: 'd1',
            prompt_text: 'What is 2+2?',
            prompt_type: 'short_answer',
            status: 'closed',
            created_at: '2026-03-11T10:05:00Z',
            participant_snapshot: 10,
        }];

        // Mock discussions - return correct shape based on which query is being made:
        // fetchDiscussionsApi uses responses(count), fetchEndedDiscussionsApi uses nested response objects
        await page.route('**/rest/v1/discussions*', async (route) => {
            const url = route.request().url();
            if (url.includes('count')) {
                // fetchDiscussionsApi: returns response_count shape
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{ ...discussionData[0], responses: [{ count: 2 }] }]),
                });
            } else {
                // fetchEndedDiscussionsApi: returns nested response objects
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{
                        ...discussionData[0],
                        responses: [
                            { id: 'r1', response_text: 'Four', created_at: '2026-03-11T10:06:00Z' },
                            { id: 'r2', response_text: '4', created_at: '2026-03-11T10:07:00Z' }
                        ]
                    }]),
                });
            }
        });

        // Mock lesson files and transcripts to prevent crashes
        await page.route('**/rest/v1/lesson_files*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
        await page.route('**/rest/v1/lesson_chunks*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });

        // Register all waitForResponse promises before navigation.
        // setLoading(false) only fires after ALL four requests below complete, so we must
        // wait for each one before asserting on the rendered SessionEndedView.
        const endedDiscussionsLoaded = page.waitForResponse(
            r => r.url().includes('/rest/v1/discussions') && !r.url().includes('count'));
        const activeDiscussionsLoaded = page.waitForResponse(
            r => r.url().includes('/rest/v1/discussions') && r.url().includes('count'));
        const filesLoaded = page.waitForResponse('**/rest/v1/lesson_files*');
        const chunksLoaded = page.waitForResponse('**/rest/v1/lesson_chunks*');

        // 1. Navigate
        await page.goto('/session/past-lesson-xyz');

        // Wait for all requests that gate setLoading(false) → SessionEndedView mount
        await endedDiscussionsLoaded;
        await activeDiscussionsLoaded;
        await filesLoaded;
        await chunksLoaded;

        // Use a longer timeout for CI environments
        await expect(page.getByText('Historical Lesson')).toBeVisible({ timeout: 15000 });

        // Identify the card first
        const discussionCard = page.locator('div.rounded-xl.border', { hasText: 'What is 2+2?' });

        // 3. Verify the heading exists
        // We use a regex for "Discussions" to be safe, and ensure it's a heading
        await expect(page.getByRole('heading', { name: /^Discussions$/ })).toBeVisible({ timeout: 10000 });

        // 4. Find the button INSIDE that specific card
        const showResponsesBtn = discussionCard.getByRole('button', { name: /Show Responses/i });

        // 5. Wait for the button to be visible and click it
        await expect(showResponsesBtn).toBeVisible({ timeout: 10000 });
        await showResponsesBtn.click();

        // 6. Resolve the Local Failure:
        // Use exact: true to avoid matching "04:04 AM" timestamps
        await expect(discussionCard.getByText('Four')).toBeVisible();
        await expect(discussionCard.getByText('4', { exact: true })).toBeVisible();
    });
});
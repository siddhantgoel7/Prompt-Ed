import { test, expect, Page } from '@playwright/test';

/**
 * UI Acceptance Tests — [US 1.29] Set a time limit for a response window
 *
 * As an Instructor
 *   I want to set a time limit for a response window
 *   So that I can control how long students have to submit their answers.
 *
 * Acceptance Criteria:
 *   AC1: Instructor sets time limit → countdown timer starts for students
 *   AC2: Time limit expires → discussion automatically closes
 *   AC3: Students see remaining time after instructor sets it
 *
 * These tests use API route mocking to avoid needing real Supabase data.
 */

const LESSON_ID = 'timer-lesson-id';
const PROJECT_REF = (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgxxmqgwrvqrdbgutnpb.supabase.co';
    return new URL(url).hostname.split('.')[0];
})();

async function setupInstructorSession(page: Page) {
    // Auth cookie
    await page.context().addCookies([{
        name: `sb-${PROJECT_REF}-auth-token`,
        value: JSON.stringify({
            access_token: 'fake-timer-token',
            refresh_token: 'fake',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: 'timer-inst', email: 'timer-inst@test.com' }
        }),
        domain: 'localhost',
        path: '/',
    }]);

    // Auth routes
    await page.route('**/auth/v1/user*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'timer-inst', email: 'timer-inst@test.com' }) });
    });
    await page.route('**/auth/v1/session*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fake-timer-token', user: { id: 'timer-inst' } }) });
    });

    // Lesson data
    await page.route(`**/rest/v1/lessons*id=eq.${LESSON_ID}*`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: LESSON_ID,
                title: 'Timer Test Lesson',
                status: 'active',
                instructor_id: 'timer-inst',
                pin_code: '777777',
                courses: { instructor_id: 'timer-inst' }
            }),
        });
    });

    // No active discussion initially
    await page.route('**/rest/v1/discussions*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/rest/v1/lesson_files*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/rest/v1/lesson_chunks*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // Suppress the one-time AI tips spotlight so it doesn't block clicks in tests.
    await page.addInitScript(() => sessionStorage.setItem('ai-tips-seen-timer-lesson-id', 'true'));

    // Stub Supabase Realtime WebSocket using Playwright's native WS interception.
    // This ensures isConnected=true in CI without a real Supabase connection.
    // Supabase Realtime uses Phoenix array protocol: [join_ref, ref, topic, event, payload]
    await page.routeWebSocket(/.*/, (ws) => {
        ws.onMessage((msg) => {
            try {
                const data = JSON.parse(msg as string);
                if (Array.isArray(data)) {
                    const [joinRef, ref, topic, event] = data;
                    if (event === 'phx_join') {
                        ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]));
                    } else if (event === 'heartbeat') {
                        ws.send(JSON.stringify([null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]));
                    }
                } else if (data.event === 'phx_join') {
                    ws.send(JSON.stringify({ topic: data.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: data.ref }));
                } else if (data.event === 'heartbeat') {
                    ws.send(JSON.stringify({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: data.ref }));
                }
            } catch (_) { /* ignore */ }
        });
    });

    await page.goto(`/session/${LESSON_ID}`);
    await expect(page.getByText('Timer Test Lesson')).toBeVisible({ timeout: 15_000 });
}

test.describe('[US 1.29] Instructor Timer Controls', () => {
    test.describe.configure({ mode: 'serial' });

    // 1
    test('[US 1.29][UI-AT1] success: timer dialog appears when instructor clicks Start Discussion', async ({ page }) => {
        await setupInstructorSession(page);

        // Type a prompt
        const promptArea = page.locator('textarea').first();
        await promptArea.fill('What is a beta blocker?');

        // Click Start Discussion
        const startBtn = page.getByTestId('start-discussion-button');
        await expect(startBtn).toBeEnabled({ timeout: 15000 });
        await startBtn.click();

        // Dialog should appear
        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5_000 });
    });

    // 2
    test('[US 1.29][UI-AT2] success: timer dialog default is 1 minute', async ({ page }) => {
        await setupInstructorSession(page);

        const promptArea = page.locator('textarea').first();
        await promptArea.fill('What is a beta blocker?');
        await page.getByTestId('start-discussion-button').click();

        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5_000 });

        const minInput = page.getByTestId('timer-minutes');
        const secInput = page.getByTestId('timer-seconds');
        await expect(minInput).toHaveValue('1');
        await expect(secInput).toHaveValue('0');
    });

    // 3
    test('[US 1.29][UI-AT3] success: "No Time Limit" checkbox is available in dialog', async ({ page }) => {
        await setupInstructorSession(page);

        const promptArea = page.locator('textarea').first();
        await promptArea.fill('What is a beta blocker?');
        await page.getByTestId('start-discussion-button').click();

        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText('No Time Limit')).toBeVisible();
    });

    // 4
    test('[US 1.29][UI-AT4] success: Cancel button in dialog closes it without publishing', async ({ page }) => {
        await setupInstructorSession(page);

        const promptArea = page.locator('textarea').first();
        await promptArea.fill('What is a beta blocker?');
        await page.getByTestId('start-discussion-button').click();
        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5_000 });

        await page.getByRole('button', { name: /Cancel/i }).click();
        await expect(page.getByText('Set Time Limit')).not.toBeVisible();
    });

    // 5
    test('[US 1.29][UI-AT5] success: Close Discussion button NOT in the center panel', async ({ page }) => {
        await setupInstructorSession(page);

        // Before a discussion starts, center panel should not have Close Discussion
        const closeBtns = page.getByRole('button', { name: /Close Discussion/i });
        await expect(closeBtns).not.toBeVisible();
    });

});

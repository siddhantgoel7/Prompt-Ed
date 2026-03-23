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
        await page.getByTestId('start-discussion-button').click();

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

    // 6
    test('[US 1.29][UI-AT6] success: timer section shows when a discussion with timer is active', async ({ page }) => {
        await setupInstructorSession(page);

        // Mock discussion insert to return a timed discussion
        await page.route('**/rest/v1/discussions*', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: 'timed-disc-1',
                        lesson_id: LESSON_ID,
                        prompt_text: 'Test timed discussion',
                        prompt_type: 'short_answer',
                        status: 'active',
                        published_at: new Date().toISOString(),
                        time_limit_seconds: 60,
                        mc_options: null,
                        correct_option: null,
                        feedback_enabled: false,
                        display_order: 0,
                        source: 'manual',
                        participant_snapshot: null,
                    }),
                });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            }
        });

        const promptArea = page.locator('textarea').first();
        await promptArea.fill('Test timed discussion');

        await page.getByTestId('start-discussion-button').click();
        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5_000 });

        // Confirm with default timer
        await page.getByRole('button', { name: /Start Discussion/i }).last().click();

        // Navigate to Timer tab to see the timer section
        await page.getByRole('tab', { name: /Timer/i }).click();

        // Timer display should appear in Timer tab
        await expect(page.getByTestId('instructor-timer')).toBeVisible({ timeout: 8_000 });
    });

    // 7
    test('[US 1.29][UI-AT7] success: timer section shows "No Time Limit" label when no timer selected', async ({ page }) => {
        await setupInstructorSession(page);

        await page.route('**/rest/v1/discussions*', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: 'no-timer-disc-1',
                        lesson_id: LESSON_ID,
                        prompt_text: 'Test no timer discussion',
                        prompt_type: 'short_answer',
                        status: 'active',
                        published_at: new Date().toISOString(),
                        time_limit_seconds: null,
                        mc_options: null,
                        correct_option: null,
                        feedback_enabled: false,
                        display_order: 0,
                        source: 'manual',
                        participant_snapshot: null,
                    }),
                });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            }
        });

        const promptArea = page.locator('textarea').first();
        await promptArea.fill('Test no timer discussion');

        await page.getByTestId('start-discussion-button').click();
        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5_000 });

        // Select No Time Limit
        await page.getByRole('checkbox').click();
        await page.getByRole('button', { name: /Start Discussion/i }).last().click();

        // Navigate to Timer tab to see the timer section
        await page.getByRole('tab', { name: /Timer/i }).click();

        // Timer tab shows No Time Limit label
        await expect(page.getByTestId('no-time-limit-label')).toBeVisible({ timeout: 8_000 });
    });

    // 8
    test('[US 1.29][UI-AT8] success: Close Discussion button appears in timer section when discussion is active', async ({ page }) => {
        await setupInstructorSession(page);

        await page.route('**/rest/v1/discussions*', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: 'disc-close-test',
                        lesson_id: LESSON_ID,
                        prompt_text: 'Close button test',
                        prompt_type: 'short_answer',
                        status: 'active',
                        published_at: new Date().toISOString(),
                        time_limit_seconds: null,
                        mc_options: null,
                        correct_option: null,
                        feedback_enabled: false,
                        display_order: 0,
                        source: 'manual',
                        participant_snapshot: null,
                    }),
                });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            }
        });

        const promptArea = page.locator('textarea').first();
        await promptArea.fill('Close button test');

        await page.getByTestId('start-discussion-button').click();
        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5_000 });
        await page.getByRole('checkbox').click(); // No time limit
        await page.getByRole('button', { name: /Start Discussion/i }).last().click();

        // Navigate to Timer tab where Close Discussion button lives
        await page.getByRole('tab', { name: /Timer/i }).click();
        await expect(page.getByTestId('close-discussion-button')).toBeVisible({ timeout: 8_000 });
    });
});

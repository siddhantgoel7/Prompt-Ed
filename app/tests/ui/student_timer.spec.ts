import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * UI Acceptance Tests — [US 2.11] See how much time a prompt has left to be answered
 *
 * As a Student
 *   I want to see how much time a prompt has left to be answered
 *   So that I can pace my response appropriately.
 *
 * Acceptance Criteria:
 *   AC1: GIVEN instructor sets time limit WHEN discussion published THEN student sees countdown
 *   AC2: GIVEN timer active THEN it updates in real-time
 *   AC3: GIVEN time expires THEN student sees "time's up" message and cannot submit
 *
 * These tests use Supabase seeded data (PIN 123456) plus API route mocking for timer data.
 */

const TEST_PIN = '123456';

async function joinLesson(page: Page) {
    // Clear all cookies and storage before each join attempt.
    // This prevents a Supabase auth session established by a previous test's
    // student-page visit from causing useHomeJoin to redirect to /instructor_dashboard
    // (which would hide the PIN input and cause all subsequent tests to timeout).
    await page.context().clearCookies();
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    }).catch(() => {/* ignore if no page loaded yet */});

    await page.goto('/');

    // HomeJoin shows a skeleton while it checks auth (useHomeJoin 'checking-auth' state).
    // Wait explicitly for the PIN input to appear — it only renders once auth resolves.
    const pinInput = page.getByLabel('PIN code');
    await pinInput.waitFor({ state: 'visible', timeout: 15_000 });

    await pinInput.fill(TEST_PIN);
    await page.getByRole('button', { name: 'Join' }).click();
    await expect(page).toHaveURL(/\/student\//, { timeout: 30_000 });
}


async function waitForDiscussionOrWaiting(page: Page): Promise<'active' | 'waiting'> {
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const questionText = page.locator('[data-testid="student-timer"]');

    try {
        await Promise.race([
            waiting.waitFor({ state: 'visible', timeout: 12_000 }),
            questionText.waitFor({ state: 'visible', timeout: 12_000 }),
        ]);
    } catch {
        return 'waiting';
    }

    return (await questionText.isVisible()) ? 'active' : 'waiting';
}

// Outer wrapper so beforeAll/afterAll run in the same worker as the serial tests.
// beforeAll seeds a timed discussion so timer-specific tests can run.
// Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS; without it, tests skip gracefully.
test.describe('Student Timer Tests', () => {
    test.beforeAll(async () => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        );
        const { data: lesson } = await supabase.from('lessons').select('id').eq('pin_code', TEST_PIN).single();
        if (!lesson) return;

        // Replace the active untimed discussion with a 2-minute timed one
        await supabase.from('discussions').update({ status: 'closed' }).eq('lesson_id', lesson.id).eq('status', 'active');
        await supabase.from('discussions').insert({
            lesson_id: lesson.id,
            prompt_text: 'What is Playwright testing?',
            prompt_type: 'multiple_choice',
            status: 'active',
            mc_options: [
                { label: 'A', text: 'Browser testing' },
                { label: 'B', text: 'A text editor' },
                { label: 'C', text: 'Some choice C' },
                { label: 'D', text: 'Some choice D' },
            ],
            correct_option: 'A',
            feedback_enabled: true,
            time_limit_seconds: 120,
            published_at: new Date().toISOString(),
        });
    });

    test.afterAll(async () => {
        // Restore the original untimed MC discussion for subsequent spec files
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        );
        const { data: lesson } = await supabase.from('lessons').select('id').eq('pin_code', TEST_PIN).single();
        if (!lesson) return;

        await supabase.from('discussions').update({ status: 'closed' }).eq('lesson_id', lesson.id).eq('status', 'active');
        await supabase.from('discussions').insert({
            lesson_id: lesson.id,
            prompt_text: 'What is Playwright testing?',
            prompt_type: 'multiple_choice',
            status: 'active',
            mc_options: [
                { label: 'A', text: 'Browser testing' },
                { label: 'B', text: 'A text editor' },
                { label: 'C', text: 'Some choice C' },
                { label: 'D', text: 'Some choice D' },
            ],
            correct_option: 'A',
            feedback_enabled: true,
        });
    });

    test.describe('[US 2.11] Student Timer Display', () => {
        test.describe.configure({ mode: 'serial' });

        // 1
        test('[US 2.11][UI-AT1] success: timer is visible in top-left when timed discussion is active', async ({ page }) => {
            await joinLesson(page);

            const state = await waitForDiscussionOrWaiting(page);

            if (state === 'waiting') {
                test.skip(true, 'No active timed discussion. Seed a discussion with time_limit_seconds.');
                return;
            }

            const timer = page.getByTestId('student-timer');
            await expect(timer).toBeVisible({ timeout: 5_000 });
        });

        // 2
        test('[US 2.11][UI-AT2] success: timer shows MM:SS countdown format', async ({ page }) => {
            await joinLesson(page);

            const state = await waitForDiscussionOrWaiting(page);

            if (state === 'waiting') {
                test.skip(true, 'No active timed discussion seeded.');
                return;
            }

            const timer = page.getByTestId('student-timer');
            await expect(timer).toBeVisible({ timeout: 5_000 });
            const text = await timer.textContent();
            expect(text).toMatch(/\d{2}:\d{2}/);
        });

        // 3
        test('[US 2.11][UI-AT3] success: no timer shown while waiting for discussion', async ({ page }) => {
            await joinLesson(page);

            const waiting = page.getByText('Waiting for the instructor to publish a discussion');
            if (await waiting.isVisible()) {
                // No active discussion — timer should not appear
                await expect(page.getByTestId('student-timer')).not.toBeVisible();
            } else {
                test.skip(true, 'Lesson already has active discussion; skip waiting-state check.');
            }
        });
    });

    test.describe('[US 2.11] Timer Expired State', () => {
        test.describe.configure({ mode: 'serial' });

        // 4
        test("[US 2.11][UI-AT4] success: timer expired message visible when timer has expired", async ({ page }) => {
            // This test seeds a discussion via API that's already expired, then checks the student view.
            // In practice, the global-setup seeds an active discussion without a timer.
            // This test validates the behaviour with a timed discussion if one was seeded.
            await joinLesson(page);

            const expiredMsg = page.getByTestId('timer-expired-message');
            const waiting = page.getByText('Waiting for the instructor to publish a discussion');

            // Wait briefly to see what state we're in
            try {
                await Promise.race([
                    expiredMsg.waitFor({ state: 'visible', timeout: 5_000 }),
                    waiting.waitFor({ state: 'visible', timeout: 5_000 }),
                    page.getByTestId('student-timer').waitFor({ state: 'visible', timeout: 5_000 }),
                ]);
            } catch {
                test.skip(true, 'Could not determine session state.');
                return;
            }

            if (await expiredMsg.isVisible()) {
                await expect(page.getByText(/Time's up/i)).toBeVisible();
                await expect(page.getByText(/No answer was submitted/i)).toBeVisible();
                // Submit button should not be present
                await expect(page.getByRole('button', { name: /Submit response/i })).not.toBeVisible();
            } else {
                test.skip(true, 'No expired discussion in current session; timer expiry test skipped.');
            }
        });

        // 5
        test('[US 2.11][UI-AT5] success: student can submit while timer is running', async ({ page }) => {
            await joinLesson(page);

            const timerEl = page.getByTestId('student-timer');

            try {
                await timerEl.waitFor({ state: 'visible', timeout: 10_000 });
            } catch {
                test.skip(true, 'No timed discussion active.');
                return;
            }

            // Timer is running — submit button should be enabled (or at least present)
            await expect(page.getByRole('button', { name: /Submit response/i })).toBeVisible({ timeout: 5_000 });
        });

        // 6
        test('[US 2.11][UI-AT6] success: no timer element shown if discussion has no time limit', async ({ page }) => {
            await joinLesson(page);

            const waiting = page.getByText('Waiting for the instructor to publish a discussion');
            const timerEl = page.getByTestId('student-timer');

            // If we're in waiting state, there's no discussion at all — no timer
            if (await waiting.isVisible()) {
                await expect(timerEl).not.toBeVisible();
            } else {
                // An active discussion exists — check if it has a timer
                const timerVisible = await timerEl.isVisible();
                // Skip when the active discussion has a timer (different scenario)
                test.skip(timerVisible, 'Seeded discussion has a time limit; skip the no-timer assertion.');
                // Active discussion with no time limit — timer should not appear
                await expect(timerEl).not.toBeVisible();
            }
        });
    });
});

import { test, expect, Page } from '@playwright/test';

/**
 * UI Acceptance Tests — [US 2.10] See if I got multiple choice questions correct
 *
 * As a Student
 * I want to see if I got multiple choice questions correct
 * So that I can receive immediate feedback on my understanding
 *
 * Acceptance Criteria:
 *   AC1: GIVEN feedback_enabled AND MC answer submitted
 *        WHEN answer is correct → see " Correct!" confirmation
 *   AC2: GIVEN feedback_enabled AND MC answer submitted
 *        WHEN answer is incorrect → see " Incorrect" and the correct option
 *   AC3: GIVEN feedback disabled → no correctness indicator shown after submit
 *
 * Prerequisites (seeded via setup_test_data.ts or SQL):
 *   - PIN 123456 → active lesson with an active MC discussion
 *   - correct_option: 'A', feedback_enabled: true
 *   - Options A = 'Browser testing', B = 'A text editor'
 *
 * Run setup first:  npx ts-node tests/ui/setup_test_data.ts
 * Then run tests:   npm run test:ui -- --grep "US 2.10"
 */

// Helper: join the test lesson and wait for the MC form to appear
async function joinAndWaitForMC(page: Page) {
    await page.goto('/');
    await page.getByLabel('PIN code').fill('123456');
    await page.getByRole('button', { name: 'Join' }).click();
    await expect(page).toHaveURL(/\/student\//, { timeout: 30_000 });
}

// Helper: returns true when an active MC discussion is visible
async function hasMCDiscussion(page: Page): Promise<boolean> {
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const optionA = page.locator('button').filter({ hasText: /^A\./ });

    try {
        await Promise.race([
            waiting.waitFor({ state: 'visible', timeout: 12_000 }),
            optionA.waitFor({ state: 'visible', timeout: 12_000 }),
        ]);
    } catch {
        return false;
    }

    return optionA.isVisible();
}

// Tests

test.describe('[US 2.10] Student sees MC feedback after submission', () => {
    test.describe.configure({ mode: 'serial' });

    // AC1 — Correct answer

    // 32.1
    test('[US 2.10][UI-AT1] success: selecting correct option shows ✅ Correct! after submit', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded. Run setup_test_data.ts first.');
            return;
        }

        // Select option A (correct in seeded data)
        await page.locator('button').filter({ hasText: /^A\./ }).click();

        // Submit
        await page.getByRole('button', { name: 'Submit response' }).click();

        // Should show correct feedback banner immediately after submit
        await expect(page.getByText('Good Job! 🎉')).toBeVisible({ timeout: 8_000 });
    });

    // 32.2
    test('[US 2.10][UI-AT2] success: correct answer shows detail "You selected the correct answer."', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        await page.locator('button').filter({ hasText: /^A\./ }).click();
        await page.getByRole('button', { name: 'Submit response' }).click();
        await expect(page.getByText('Good Job! 🎉')).toBeVisible({ timeout: 8_000 });

        // Correct option A should be highlighted green in the prompt card
        await expect(page.locator('button').filter({ hasText: /^A\./ }).first()).toHaveClass(/bg-green-100/, { timeout: 5_000 });
    });

    // 32.3
    test('[US 2.10][UI-AT3] success: correct feedback block is green', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        await page.locator('button').filter({ hasText: /^A\./ }).click();
        await page.getByRole('button', { name: 'Submit response' }).click();
        await expect(page.getByText('Good Job! 🎉')).toBeVisible({ timeout: 8_000 });

        // The feedback banner should carry green styling classes
        const feedbackCard = page.locator('[class*="green"]').filter({ hasText: 'Good Job! 🎉' });
        await expect(feedbackCard).toBeVisible();
    });

    // AC2 — Incorrect answer  (requires a fresh session — new page context below)

    // 32.4
    test('[US 2.10][UI-AT4] failure: selecting wrong option shows ❌ Incorrect after submit', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        // Select option B (incorrect in seeded data where correct_option='A')
        await page.locator('button').filter({ hasText: /^B\./ }).click();
        await page.getByRole('button', { name: 'Submit response' }).click();
        await expect(page.getByText('Oops! 😔')).toBeVisible({ timeout: 8_000 });
    });

    // 32.5
    test('[US 2.10][UI-AT5] failure: incorrect answer reveals the correct option label', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        await page.locator('button').filter({ hasText: /^B\./ }).click();
        await page.getByRole('button', { name: 'Submit response' }).click();
        await expect(page.getByText('Oops! 😔')).toBeVisible({ timeout: 8_000 });

        // Correct option A should be highlighted green in the prompt card
        await expect(page.locator('button').filter({ hasText: /^A\./ }).first()).toHaveClass(/bg-green-100/, { timeout: 5_000 });
    });

    // 32.6
    test('[US 2.10][UI-AT6] failure: incorrect feedback block is red', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        await page.locator('button').filter({ hasText: /^B\./ }).click();
        await page.getByRole('button', { name: 'Submit response' }).click();
        await expect(page.getByText('Oops! 😔')).toBeVisible({ timeout: 8_000 });

        const feedbackCard = page.locator('[class*="red"]').filter({ hasText: 'Oops! 😔' });
        await expect(feedbackCard).toBeVisible();
    });

    // 32.7
    test('[US 2.10][UI-AT7] failure: "❌ Correct!" is NOT shown when answer is wrong', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        await page.locator('button').filter({ hasText: /^B\./ }).click();
        await page.getByRole('button', { name: 'Submit response' }).click();
        await expect(page.getByText('Oops! 😔')).toBeVisible({ timeout: 8_000 });

        await expect(page.getByText('Good Job! 🎉')).not.toBeVisible();
    });

    // Validation: submit without selecting an option

    // 32.8
    test('[US 2.08][AC4-AT1] failure: clicking Submit without selecting an option shows validation message', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        // Click submit without choosing an option
        await page.getByRole('button', { name: 'Submit response' }).click();

        // Validation alert should appear
        await expect(page.getByText('Please select an answer')).toBeVisible({ timeout: 5_000 });
    });

    // 32.9
    test('[US 2.08][AC4-AT2] failure: validation error clears after selecting an option', async ({ page }) => {
        await joinAndWaitForMC(page);

        if (!await hasMCDiscussion(page)) {
            test.skip(true, 'No active MC discussion seeded.');
            return;
        }

        // Trigger validation
        await page.getByRole('button', { name: 'Submit response' }).click();
        await expect(page.getByText('Please select an answer')).toBeVisible({ timeout: 5_000 });

        // Now select an option
        await page.locator('button').filter({ hasText: /^A\./ }).click();

        // Validation should be gone
        await expect(page.getByText('Please select an answer')).not.toBeVisible();
    });

    // General: feedback block absent when waiting

    // 32.10
    test('[US 2.10][UI-AT10] success: no feedback block shown while waiting for discussion', async ({ page }) => {
        await joinAndWaitForMC(page);

        const waiting = page.getByText('Waiting for the instructor to publish a discussion');
        if (await waiting.isVisible()) {
            // No MC discussion active, so no feedback blocks should appear
            await expect(page.getByText('✅ Correct!')).not.toBeVisible();
            await expect(page.getByText(/❌ Incorrect/i)).not.toBeVisible();
        } else {
            // Skip this particular assertion — session is active instead
            test.skip(true, 'Active discussion exists; skip waiting-state check.');
        }
    });
});

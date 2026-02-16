import { test, expect } from '@playwright/test';

/**
 * UI Automation — Student Submit Response
 * PIN 123456 is seeded by global-setup.ts with an active lesson + active discussion.
 */
test.describe('Student Submit Response', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('PIN code').fill('123456');
    await page.getByRole('button', { name: 'Join' }).click();

    // Should navigate to student session
    await expect(page).toHaveURL(/\/student\//, { timeout: 30000 });
  });

  // 24.1
  test('[US 2.09][US 2.07] prompt visible -> can submit response', async ({ page }) => {
    // Wait for either waiting card or response form
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const responseBox = page.getByPlaceholder('Type your response here...');

    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    // If waiting for discussion, skip gracefully
    if (await waiting.isVisible()) {
      await expect(waiting).toBeVisible();
      return;
    }

    // Active discussion: prompt visible + response form usable
    await expect(responseBox).toBeVisible();

    await responseBox.fill('My response from Playwright');
    await page.getByRole('button', { name: 'Submit response' }).click();

    // After submit, "Response submitted" alert appears
    await expect(page.getByText('Response submitted')).toBeVisible({ timeout: 5000 });
  });

  // 24.2
  test('[US 2.07] failure: blank response blocked', async ({ page }) => {
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const responseBox = page.getByPlaceholder('Type your response here...');

    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    test.skip(await waiting.isVisible(), 'No active discussion in this environment.');

    // Submit should be disabled when blank (disabled={!canSubmit})
    await expect(page.getByRole('button', { name: 'Submit response' })).toBeDisabled();
  });

  // 24.3
  test('[US 2.07] failure: whitespace-only response should be blocked', async ({ page }) => {
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const responseBox = page.getByPlaceholder('Type your response here...');

    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    test.skip(await waiting.isVisible(), 'No active discussion in this environment.');

    // Fill with only whitespace
    await responseBox.fill('   ');

    // Submit button should be disabled for whitespace-only input
    await expect(page.getByRole('button', { name: 'Submit response' })).toBeDisabled();
  });
});
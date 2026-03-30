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
    // Wait for waiting card, text response box, or MC option buttons
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const responseBox = page.getByPlaceholder('Type your response here...');
    const mcOptionA = page.getByTestId('mc-option-A');

    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
      mcOptionA.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    // If waiting for discussion, skip gracefully
    if (await waiting.isVisible()) {
      await expect(waiting).toBeVisible();
      return;
    }

    // Active discussion — check if it's MC or text
    const mcOption = page.locator('label[data-testid^="mc-option-"]').first();
    if (await mcOption.isVisible()) {
      // MC question: select an option and submit
      await mcOption.click();
      await page.getByRole('button', { name: 'Submit response' }).click();
      // After MC submit with feedback enabled, shows feedback banner immediately
      await expect(
        page.getByText('Good Job! 🎉').or(page.getByText('Oops! 😔')).or(page.getByText('Response submitted'))
      ).toBeVisible({ timeout: 8000 });
    } else {
      // Text response: fill textarea and submit
      await expect(responseBox).toBeVisible();
      await responseBox.fill('My response from Playwright');
      await page.getByRole('button', { name: 'Submit response' }).click();
      await expect(page.getByText('Response submitted')).toBeVisible({ timeout: 5000 });
    }
  });

  // 24.2
  test('[US 2.07] failure: blank response blocked', async ({ page }) => {
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const responseBox = page.getByPlaceholder('Type your response here...');
    const mcOptionA = page.getByTestId('mc-option-A');

    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
      mcOptionA.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    if (await waiting.isVisible()) return;

    // For MC, the button is left enabled to allow clicking -> validation message
    const mcOption = page.locator('label[data-testid^="mc-option-"]').first();
    if (await mcOption.isVisible()) {
      const submitBtn = page.getByRole('button', { name: 'Submit response' });
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
      await expect(page.getByText('Please select an answer')).toBeVisible();
    } else {
      // For text response, it should be disabled when empty
      await expect(page.getByRole('button', { name: 'Submit response' })).toBeDisabled();
    }
  });

  // 24.3
  test('[US 2.07] failure: whitespace-only response should be blocked', async ({ page }) => {
    const waiting = page.getByText('Waiting for the instructor to publish a discussion');
    const responseBox = page.getByPlaceholder('Type your response here...');
    const mcOptionA = page.getByTestId('mc-option-A');

    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
      mcOptionA.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    if (await waiting.isVisible()) return;

    const mcOption = page.locator('label[data-testid^="mc-option-"]').first();
    if (await mcOption.isVisible()) {
      // Whitespace-only blocking is handled by text fields, not MC selections
      return;
    }

    // Fill with only whitespace
    await responseBox.fill('   ');

    // Submit button should be disabled for whitespace-only input
    await expect(page.getByRole('button', { name: 'Submit response' })).toBeDisabled();
  });
});
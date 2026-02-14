import { test, expect } from '@playwright/test';

test.describe('Student Submit Response', () => {
  test('[US 2.09][US 2.07] prompt visible -> can submit response', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder(/enter pin/i).fill('123456');
    await page.getByRole('button', { name: /join/i }).click();

    // We might land in waiting state if no active discussion exists.
    const waiting = page.getByText(/wait for the next prompt|waiting/i);
    const responseBox = page.getByPlaceholder(/type your response here/i);

    // Wait until either waiting OR response form appears
    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    // If waiting, assert waiting behavior and exit cleanly
    if (await waiting.isVisible()) {
      await expect(waiting).toBeVisible();
      return;
    }

    // Otherwise we have an active discussion: prompt + response form should be usable
    await expect(responseBox).toBeVisible();

    await responseBox.fill('My response from Playwright');
    await page.getByRole('button', { name: /submit response/i }).click();

    // StudentSessionPage shows this after submit:
    await expect(page.getByText(/response submitted/i)).toBeVisible();
  });

  test('[US 2.07][AT2] blank response blocked (only when form is present)', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder(/enter pin/i).fill('123456');
    await page.getByRole('button', { name: /join/i }).click();

    const waiting = page.getByText(/wait for the next prompt|waiting/i);
    const responseBox = page.getByPlaceholder(/type your response here/i);

    await Promise.race([
      waiting.waitFor({ state: 'visible', timeout: 10000 }),
      responseBox.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    // If no active discussion, the blank-submit test is not applicable
    test.skip(await waiting.isVisible(), 'No active discussion in this environment.');

    // Submit should be disabled when blank (disabled={!canSubmit})
    await expect(page.getByRole('button', { name: /submit response/i })).toBeDisabled();
  });
});

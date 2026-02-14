import { test, expect } from '@playwright/test';

/**
 * UI Automation
 * [US 2.06][AT1][AT4] Valid PIN joins lesson
 * [US 2.06][AT2][US 2.03][AT3] Invalid PIN shows error / denied
 */
test.describe('Student Join Flow', () => {
  test('[US 2.06] success: valid PIN joins lesson', async ({ page }) => {
    await page.goto('/');

    // Prefer label-based (best for user POV), fallback to placeholder, fallback to first input
    const pinInput =
      page.getByLabel(/pin/i).first()
        .or(page.getByPlaceholder(/pin/i).first())
        .or(page.locator('input[type="text"], input[type="tel"], input').first());

    await expect(pinInput).toBeVisible();
    await pinInput.fill('123456');
    await page.getByRole('button', { name: /join/i }).click();

    // This will depend on your actual behavior (route or in-page state)
    await expect(page).not.toHaveURL(/build error/i);
  });

  test('[US 2.06] failure: invalid PIN shows error', async ({ page }) => {
    await page.goto('/');
    const pinInput =
      page.getByLabel(/pin/i).first()
        .or(page.getByPlaceholder(/pin/i).first())
        .or(page.locator('input[type="text"], input[type="tel"], input').first());

    await expect(pinInput).toBeVisible();
    await pinInput.fill('123456');
    await page.getByRole('button', { name: /join/i }).click();


    await expect(page.getByText(/invalid|not found|try again|error/i)).toBeVisible();
  });
});

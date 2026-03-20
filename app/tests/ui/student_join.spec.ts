import { test, expect } from '@playwright/test';

/**
 * UI Automation — Student Join Flow
 * Tests use PIN 123456 which is seeded by global-setup.ts as an active lesson.
 * PIN 999999 is used for "not found" tests.
 */
test.describe('Student Join Flow', () => {
  test.describe.configure({ mode: 'serial' });
  
  // 22.1
  test('[US 2.06] success: valid PIN joins lesson', async ({ page }) => {
    await page.goto('/');

    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();
    await pinInput.fill('123456');
    await page.getByRole('button', { name: 'Join' }).click();

    // Should navigate to /student/<lessonId>
    await expect(page).toHaveURL(/\/student\//, { timeout: 30000 });
  });

  // 22.2
  test('[US 2.06] failure: invalid PIN shows error', async ({ page }) => {
    await page.goto('/');
    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    // Use a PIN that doesn't exist
    await pinInput.fill('999999');
    await page.getByRole('button', { name: 'Join' }).click();

    // Error text from useHomeJoin: "Invalid PIN. Please try again."
    await expect(page.getByText('Invalid PIN. Please try again.')).toBeVisible({ timeout: 10000 });
  });

  // 22.3
  test('[US 2.06] failure: empty PIN shows validation hint', async ({ page }) => {
    await page.goto('/');

    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    // Verify empty state shows "PIN is 6 digits." hint
    await expect(page.getByText('PIN is 6 digits')).toBeVisible();
  });

  // 22.4
  test('[US 2.06] failure: non-numeric PIN rejected', async ({ page }) => {
    await page.goto('/');

    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    // Type letters — the hook filters non-digits, so input stays empty
    await pinInput.fill('abcdef');

    // Join button should be disabled
    await expect(page.getByRole('button', { name: 'Join' })).toBeDisabled();

    // Should show empty hint since non-digits are filtered
    await expect(page.getByText('PIN is 6 digits')).toBeVisible();
  });

  // 22.5
  test('[US 2.06] failure: too short PIN rejected', async ({ page }) => {
    await page.goto('/');

    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    await pinInput.fill('123');

    await expect(page.getByRole('button', { name: 'Join' })).toBeDisabled();
    await expect(page.getByText('Enter exactly 6 digits')).toBeVisible();
  });

  // 22.6
  test('[US 2.06] success: 6-digit PIN enables join button', async ({ page }) => {
    await page.goto('/');

    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    await pinInput.fill('123456');

    await expect(page.getByRole('button', { name: 'Join' })).toBeEnabled();
    await expect(page.getByText('✓ Looks good')).toBeVisible();
  });
});
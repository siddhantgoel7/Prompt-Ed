import { test, expect } from '@playwright/test';

/**
 * UI Automation for [US 2.01][US 2.02] Desktop and Mobile Access
 * Students should be able to access the app on both desktop and mobile devices
 */
test.describe('Student Responsive Design', () => {
  // 23.1
  test('[US 2.01] success: landing page renders on desktop viewport', async ({ page }) => {
    // Set desktop viewport (1280x720)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Verify PIN input is visible on desktop
    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    // Verify Join button is visible on desktop
    const joinButton = page.getByRole('button', { name: 'Join' });
    await expect(joinButton).toBeVisible();

    // Verify the card header is visible
    await expect(page.getByText('Join a session')).toBeVisible();
  });

  // 23.2
  test('[US 2.02] success: landing page renders on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE - 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify PIN input is visible on mobile
    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    // Verify Join button is visible on mobile
    const joinButton = page.getByRole('button', { name: 'Join' });
    await expect(joinButton).toBeVisible();

    // Verify the card header is visible
    await expect(page.getByText('Join a session')).toBeVisible();

    // Verify no horizontal scrollbar (check body width)
    const bodyWidth = await page.locator('body').evaluate((el) => el.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  // 23.3
  test('[US 2.02] success: student session page renders on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE - 375x667)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to student session page (with a test lesson ID)
    await page.goto('/student/test-lesson-id');

    // Verify the page renders without horizontal scroll
    const bodyWidth = await page.locator('body').evaluate((el) => el.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);

    // Verify page content is visible (even if "lesson not found" or "waiting")
    await expect(page.locator('body')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

/**
 * UI Automation for [US 2.03] Anonymous Access
 * Students should NOT require authentication to join lessons
 */
test.describe('Student Anonymous Access', () => {
  // 21.1
  test('[US 2.03] success: landing page has no login requirement for students', async ({ page }) => {
    await page.goto('/');

    // PIN input should be immediately visible without any login
    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    // Join button should be visible
    const joinButton = page.getByRole('button', { name: 'Join' });
    await expect(joinButton).toBeVisible();

    // No login form should be required to see the student join section
    // (Login/Signup buttons are in header for instructors only)
    await expect(page.getByText('Join a session')).toBeVisible();
    await expect(page.getByText('Enter the 6-digit PIN provided by your instructor.')).toBeVisible();
  });

  // 21.2
  test('[US 2.03] success: no personal data fields on student join', async ({ page }) => {
    await page.goto('/');

    // The student section should ONLY have the PIN input
    const pinInput = page.getByLabel('PIN code');
    await expect(pinInput).toBeVisible();

    // Verify NO name/email/password fields are visible in the student join section
    const nameField = page.getByLabel(/name/i);
    const emailField = page.getByLabel(/email/i);
    const passwordField = page.getByLabel(/password/i);

    // These should either not exist or not be visible
    await expect(nameField).not.toBeVisible();
    await expect(emailField).not.toBeVisible();
    await expect(passwordField).not.toBeVisible();
  });

  // 21.3
  test('[US 2.03] success: student can reach session without authentication', async ({ page }) => {
    // Navigate directly to a student session URL (if lesson exists)
    // In a real scenario, we'd need a valid lesson ID, but we're testing the route is accessible
    await page.goto('/student/some-lesson-id');

    // Page should load without redirect to login
    // We expect either:
    // 1. A "lesson not found" message (acceptable - no auth required to see it)
    // 2. A waiting/session page (if lesson exists)
    // 3. NOT a redirect to /login_instructor

    // Verify we didn't get redirected to login
    await expect(page).not.toHaveURL(/login_instructor|create_instructor/);

    // Verify the page loaded some content (not a blank page)
    // This is a weak assertion but ensures no auth gate blocked the page
    await expect(page.locator('body')).toBeVisible();
  });
});
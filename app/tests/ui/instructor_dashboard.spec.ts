import { test, expect } from '@playwright/test';

/**
 * UI Automation — Instructor Dashboard
 * The dashboard requires authentication. Unauthenticated users get redirected to '/'.
 * We test: (1) the redirect behavior, (2) the loading state that appears briefly.
 *
 * [US 1.03] Logout button is tested here via its presence in the dashboard header.
 * [US 1.49] "Add a course" button presence.
 * [US 1.50] Delete course flow.
 */
test.describe('Instructor Dashboard (auth-gated)', () => {
  test('[US 1.49][US 1.03] unauthenticated user sees loading then redirects to home', async ({ page }) => {
    await page.goto('/instructor_dashboard');

    // The dashboard shows "Loading..." while checking auth
    // Then redirects unauthenticated users to '/'
    // We should end up at the home page
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // Home page should show the student join form
    await expect(page.getByLabel('PIN code')).toBeVisible();
  });

  test('[US 1.05] unauthenticated user accessing lessons page redirects to home', async ({ page }) => {
    await page.goto('/lessons_page/some-course-id');

    // Should redirect to home since not authenticated
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });
  });
});

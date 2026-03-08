import { test, expect } from '@playwright/test';

test.describe('Student Session API Scoping & Real-time Status', () => {

    test.beforeEach(async ({ page }) => {
        // [US 1.26, US 2.04]
        // fetchLessonByPinApi uses .single()
        await page.route('**/rest/v1/lessons*pin_code=eq.999999*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'student-lesson-id',
                    title: 'My Enrolled Lesson',
                    status: 'active',
                    pin_code: '999999'
                }),
            });
        });

        // fetchLessonByIdApi uses .single()
        await page.route('**/rest/v1/lessons*id=eq.student-lesson-id*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'student-lesson-id',
                    title: 'My Enrolled Lesson',
                    status: 'active',
                    pin_code: '999999'
                }),
            });
        });

        await page.route('**/rest/v1/responses*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
    });

    test('[US 1.26][US 2.04] success: student sees only prompts scoped to their exact lesson_id', async ({ page }) => {
        await page.route('**/rest/v1/discussions*lesson_id=eq.student-lesson-id*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 'd1',
                    prompt_text: 'What is the powerhouse of the cell?',
                    prompt_type: 'short_answer',
                    status: 'active',
                    lesson_id: 'student-lesson-id'
                }]),
            });
        });

        await page.route('**/rest/v1/discussions*lesson_id=eq.other-lesson-id*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        await page.goto('/');
        await page.getByLabel('PIN code').fill('999999');
        await page.getByRole('button', { name: 'Join' }).click();

        await expect(page.getByText('What is the powerhouse of the cell?')).toBeVisible({ timeout: 15000 });
    });

    // [US 2.15]
    test('[US 2.15] success: student sees exact status badge based on discussion state', async ({ page }) => {
        await page.route('**/rest/v1/discussions*lesson_id=eq.student-lesson-id*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]), // No active discussion available
            });
        });

        await page.goto('/');
        await page.getByLabel('PIN code').fill('999999');
        await page.getByRole('button', { name: 'Join' }).click();

        await expect(page.getByText(/Waiting for the instructor to publish a discussion/i)).toBeVisible({ timeout: 15000 });
        await expect(page.locator('span', { hasText: /^Active$/ })).toBeVisible();
    });

});

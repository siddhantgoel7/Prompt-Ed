import { test, expect } from '@playwright/test';

test('debug', async ({ page }) => {
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

    await page.route('**/rest/v1/discussions*lesson_id=eq.student-lesson-id*', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                id: 'd2',
                prompt_text: 'Is this closed?',
                prompt_type: 'short_answer',
                status: 'closed', // Closed state
                lesson_id: 'student-lesson-id'
            }]),
        });
    });

    await page.goto('/');
    await page.getByLabel('PIN code').fill('999999');
    await page.getByRole('button', { name: 'Join' }).click();

    await page.waitForTimeout(4000);
    const content = await page.evaluate(() => document.body.innerText);
    console.log(content);
});

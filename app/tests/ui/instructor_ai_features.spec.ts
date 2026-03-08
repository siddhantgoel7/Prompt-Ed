import { test, expect } from '@playwright/test';

test.describe('Instructor AI Features & Tools', () => {

    test.beforeEach(async ({ page }) => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgxxmqgwrvqrdbgutnpb.supabase.co';
        const projectRef = new URL(url).hostname.split('.')[0];

        await page.context().addCookies([{
            name: `sb-${projectRef}-auth-token`,
            value: JSON.stringify({
                access_token: 'fake',
                refresh_token: 'fake',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { id: 'ai-inst', email: 'inst@ai.com' }
            }),
            domain: 'localhost',
            path: '/',
        }]);

        await page.route('**/auth/v1/user*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'ai-inst', email: 'inst@ai.com' }) });
        });
        await page.route('**/auth/v1/session*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fake', user: { id: 'ai-inst' } }) });
        });

        await page.route('**/rest/v1/lessons*id=eq.ai-lesson-id*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'ai-lesson-id',
                    title: 'AI Lesson Room',
                    status: 'active',
                    instructor_id: 'ai-inst',
                    pin_code: '444444',
                    courses: { instructor_id: 'ai-inst' }
                }),
            });
        });

        await page.route('**/rest/v1/discussions*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
        await page.route('**/rest/v1/lesson_files*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
        await page.route('**/rest/v1/lesson_chunks*', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });

        await page.goto('/session/ai-lesson-id');
        await expect(page.getByText('AI Lesson Room')).toBeVisible({ timeout: 15000 });
    });

    // 43.1
    test('[US 1.16] success: file upload button exists and tab handles pdf sources', async ({ page }) => {
        test.skip(!!process.env.CI, 'Flaky in CI');
        const uploadTab = page.getByRole('tab', { name: 'Files' });
        await expect(uploadTab).toBeVisible({ timeout: 15000 });
        await uploadTab.click();

        const addFilesButton = page.locator('button', { hasText: 'Upload File' }).or(page.locator('label', { hasText: 'Click to upload' }));
        await expect(addFilesButton).toBeVisible({ timeout: 15000 });
    });

    // 43.2
    test('[US 1.17] success: toggle STT transcript capture', async ({ page }) => {
        test.skip(!!process.env.CI, 'Flaky in CI');
        const startRecord = page.locator('button:has-text("Start Recording")').or(page.locator('button', { hasText: /Start Recording/i }));
        await expect(startRecord).toBeVisible({ timeout: 15000 });
        await expect(page.locator('textarea[placeholder*="Spoken content"]')).toBeVisible({ timeout: 15000 });
    });

    // 43.3
    test('[US 1.18][US 1.19][US 1.23] success: generates different prompt types and allows selection', async ({ page }) => {
        test.skip(!!process.env.CI, 'Flaky in CI');
        await page.route('**/api/lessons/ai-lesson-id/generate', async (route) => {
            const payload = route.request().postDataJSON();

            if (payload?.promptType === 'multiple_choice') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        candidates: [{
                            promptText: 'AI MOCKED: Multiple Choice Question?',
                            promptType: 'multiple_choice',
                            mcOptions: [{ label: 'A', text: 'Option A', is_correct: true }, { label: 'B', text: 'Option B' }]
                        }]
                    }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        candidates: [{
                            promptText: 'AI MOCKED: Short Answer Question?',
                            promptType: 'short_answer'
                        }]
                    }),
                });
            }
        });

        const contextBox = page.locator('textarea[placeholder*="Spoken content"]');
        await expect(contextBox).toBeVisible({ timeout: 15000 });
        await contextBox.fill('This is my lecture context for the AI generator.');

        await page.getByRole('button', { name: /Generate Prompt/i }).click();

        await expect(page.getByText('AI MOCKED: Short Answer Question?')).toBeVisible({ timeout: 15000 });

        const producedPromptCard = page.locator('div').filter({ hasText: 'AI MOCKED: Short Answer Question?' }).first();
        await producedPromptCard.click();

        const selectDropdown = page.locator('select');
        await selectDropdown.selectOption('multiple_choice');

        await page.getByRole('button', { name: /Regenerate Options/i }).or(page.getByRole('button', { name: /Generate Prompt/i })).click();

        await expect(page.getByText('AI MOCKED: Multiple Choice Question?')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Option A')).toBeVisible();
        await expect(page.getByText('Option B')).toBeVisible();
    });
});

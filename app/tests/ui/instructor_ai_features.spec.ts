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

        // Suppress the one-time AI tips spotlight so it doesn't block clicks in tests.
        await page.addInitScript(() => sessionStorage.setItem('ai-tips-seen-ai-lesson-id', 'true'));

        // Stub Supabase Realtime WebSocket using Playwright's native WS interception.
        // This ensures isConnected=true in CI without a real Supabase connection.
        // Supabase Realtime uses Phoenix array protocol: [join_ref, ref, topic, event, payload]
        await page.routeWebSocket(/.*/, (ws) => {
            ws.onMessage((msg) => {
                try {
                    const data = JSON.parse(msg as string);
                    if (Array.isArray(data)) {
                        const [joinRef, ref, topic, event] = data;
                        if (event === 'phx_join') {
                            ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]));
                        } else if (event === 'heartbeat') {
                            ws.send(JSON.stringify([null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]));
                        }
                    } else if (data.event === 'phx_join') {
                        ws.send(JSON.stringify({ topic: data.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: data.ref }));
                    } else if (data.event === 'heartbeat') {
                        ws.send(JSON.stringify({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: data.ref }));
                    }
                } catch (_) { /* ignore */ }
            });
        });

        await page.goto('/session/ai-lesson-id');
        await expect(page.getByText('AI Lesson Room')).toBeVisible({ timeout: 15000 });
    });

    // 43.1
    test('[US 1.16] success: file upload button exists and tab handles pdf sources', async ({ page }) => {
        const uploadTab = page.getByRole('tab', { name: 'Files' });
        await expect(uploadTab).toBeVisible({ timeout: 15000 });
        await uploadTab.click();

        const addFilesButton = page.locator('button', { hasText: 'Upload File' }).or(page.locator('label', { hasText: 'Click to upload' }));
        await expect(addFilesButton).toBeVisible({ timeout: 15000 });
    });

    // 43.2
    test('[US 1.17] success: toggle STT transcript capture', async ({ page }) => {
        const startRecord = page.locator('button:has-text("Record")').or(page.locator('button', { hasText: /^Record$/i }));
        await expect(startRecord).toBeVisible({ timeout: 15000 });
        await expect(page.locator('textarea[placeholder*="Spoken content"]')).toBeVisible({ timeout: 15000 });
    });

    // 43.3
    test('[US 1.18][US 1.19][US 1.23] success: generates different prompt types and allows selection', async ({ page }) => {
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

        const producedPromptCard = page.locator('button').filter({ hasText: 'AI MOCKED: Short Answer Question?' }).first();
        await producedPromptCard.click();

        const selectDropdown = page.locator('select');
        await selectDropdown.selectOption('multiple_choice');

        await page.getByRole('button', { name: /Regenerate Options/i }).or(page.getByRole('button', { name: /Generate Prompt/i })).click();

        await expect(page.getByText('AI MOCKED: Multiple Choice Question?')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Option A')).toBeVisible();
        await expect(page.getByText('Option B')).toBeVisible();
    });

    // 43.4
    test('[US 1.20] success: instructor can edit AI-generated prompts before publishing', async ({ page }) => {

        await page.route('**/api/lessons/ai-lesson-id/generate', async (route) => {
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
        });

        // Generate a prompt
        const contextBox = page.locator('textarea[placeholder*="Spoken content"]');
        await expect(contextBox).toBeVisible({ timeout: 15000 });
        await contextBox.fill('Generate me a short answer question.');
        await page.getByRole('button', { name: /Generate Prompt/i }).click();

        // Ensure candidate visible
        await expect(page.getByText('AI MOCKED: Short Answer Question?')).toBeVisible({ timeout: 15000 });

        // Select the candidate
        const producedPromptCard = page.locator('button').filter({ hasText: 'AI MOCKED: Short Answer Question?' }).first();
        await producedPromptCard.click();

        // When selected, it becomes an editable textarea. The value should be the prompt text.
        const editableTextarea = page.locator('textarea[placeholder="Edit this prompt..."]');
        await expect(editableTextarea).toBeVisible({ timeout: 5000 });
        await expect(editableTextarea).toHaveValue('AI MOCKED: Short Answer Question?');

        // Edit the prompt
        await editableTextarea.fill('EDITED: Short Answer Question!');

        // Mock the publish endpoint
        let publishedPayload: any = null;
        await page.route('**/rest/v1/discussions*', async (route) => {
            if (route.request().method() === 'POST') {
                publishedPayload = route.request().postDataJSON();
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify([{ id: 'mocked-discussion-id', ...publishedPayload, status: 'active' }]),
                });
            } else {
                await route.fallback();
            }
        });

        // Clicking "Publish This Question →" opens the StartDiscussionDialog (timer config).
        // The POST to /rest/v1/discussions only fires after the dialog is confirmed.
        const publishAiBtn = page.getByTestId('publish-ai-question-button');
        await expect(publishAiBtn).toBeEnabled({ timeout: 15000 });
        await publishAiBtn.click();

        // Wait for and interact with the timer dialog
        await expect(page.getByText('Set Time Limit')).toBeVisible({ timeout: 5000 });
        await page.getByText('No Time Limit').click();
        // Click the dialog's confirm button (labelled "Start Discussion" by default)
        await page.getByRole('button', { name: /Start Discussion/i }).last().click();

        // Now the network request fires — wait for it to settle
        await page.waitForTimeout(500);
        expect(publishedPayload).toBeTruthy();
        expect(Array.isArray(publishedPayload)).toBe(true);
        expect(publishedPayload[0].prompt_text).toBe('EDITED: Short Answer Question!');
    });

    test('[US 1.20] failure: cannot publish an empty edited prompt', async ({ page }) => {

        await page.route('**/api/lessons/ai-lesson-id/generate', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    candidates: [{
                        promptText: 'AI MOCKED: Question?',
                        promptType: 'short_answer'
                    }]
                }),
            });
        });

        const contextBox = page.locator('textarea[placeholder*="Spoken content"]');
        await expect(contextBox).toBeVisible({ timeout: 15000 });
        await contextBox.fill('Generate me a short answer question.');
        await page.getByRole('button', { name: /Generate Prompt/i }).click();

        const producedPromptCard = page.locator('button').filter({ hasText: 'AI MOCKED: Question?' }).first();
        await expect(producedPromptCard).toBeVisible({ timeout: 15000 });
        await producedPromptCard.click();

        const editableTextarea = page.locator('textarea[placeholder="Edit this prompt..."]');
        await expect(editableTextarea).toBeVisible({ timeout: 5000 });

        // Clear the text
        await editableTextarea.fill('');

        // Verify the inner publish button is disabled
        const innerPublishButton = page.getByRole('button', { name: /Publish This Question/i });
        await expect(innerPublishButton).toBeDisabled();

        // Verify the outer discussion button is also disabled
        const outerStartDiscussionBtn = page.getByRole('button', { name: /Start Discussion/i, exact: true });
        await expect(outerStartDiscussionBtn).toBeDisabled();
    });
});

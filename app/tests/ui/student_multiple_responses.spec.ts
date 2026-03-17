import { test, expect } from '@playwright/test';

test.describe('Student Multiple Responses (E2E)', () => {
  // Use sequential mode
  test.describe.configure({ mode: 'serial' });

  test('[US 1.30] success: end-to-end flow allowing multiple responses', async ({ browser }) => {
    // This test creates a real Supabase user, which requires:
    //   1. A @ualberta.ca email address (enforced by SignUpForm)
    //   2. Email confirmation from Supabase before the session is created
    // Neither can be satisfied in CI without real email infrastructure.
    test.skip(true, 'Requires real Supabase email sign-up with @ualberta.ca domain — cannot run without email confirmation infrastructure');

    // Generate a unique identifier for this test run
    const uniqueId = `test_inst_${Date.now()}`;
    // Must use @ualberta.ca — SignUpForm enforces this domain restriction
    const instEmail = `${uniqueId}@ualberta.ca`;
    const instPassword = 'Password123!';

    const instructorContext = await browser.newContext();
    const instructorPage = await instructorContext.newPage();
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();

    // 1. Instructor signs up
    await instructorPage.goto('/create_instructor');
    await instructorPage.getByLabel('Full Name').fill('Multiple Response Tester');
    await instructorPage.getByLabel('Email').fill(instEmail);
    await instructorPage.getByLabel('Password').fill(instPassword);
    await instructorPage.locator('input[type="checkbox"]').check();
    await instructorPage.getByRole('button', { name: 'Sign Up' }).click();

    // Should navigate to dashboard
    await expect(instructorPage).toHaveURL(/\/instructor_dashboard/, { timeout: 30000 });

    // 2. Instructor creates a course
    await instructorPage.getByText('Add a course').click();
    await instructorPage.getByPlaceholder('Ex. Biology 101').fill('Playwright Course');
    await instructorPage.getByRole('button', { name: 'Add' }).click();
    await expect(instructorPage.getByText('Playwright Course')).toBeVisible({ timeout: 10000 });

    // Click into the course
    await instructorPage.getByRole('button', { name: 'Playwright Course' }).click();
    await expect(instructorPage).toHaveURL(/\/lessons_page/);

    // 3. Instructor creates a lesson
    await instructorPage.getByRole('button', { name: 'Add a Lesson' }).click();
    await instructorPage.getByPlaceholder('Ex. Module 1: Introduction').fill('Authored Lesson');
    await instructorPage.getByRole('button', { name: 'Add' }).click();
    await expect(instructorPage.getByText('Authored Lesson')).toBeVisible({ timeout: 10000 });

    // 4. Extract PIN
    const pinText = await instructorPage.locator('p').filter({ hasText: /PIN:/ }).first().textContent();
    const match = pinText?.match(/PIN:\s*(\d{6})/);
    expect(match).toBeTruthy();
    const PIN = match![1];

    // Click into the lesson
    await instructorPage.getByText('Authored Lesson').click();

    // 5. Start the lesson
    await instructorPage.getByRole('button', { name: 'Start Lesson' }).click();
    await expect(instructorPage).toHaveURL(/\/session\//, { timeout: 15000 });

    // 6. Instructor creates multiple choice discussion with multiple responses
    await instructorPage.getByText('Manual Creation').click();
    await instructorPage.locator('select').nth(0).selectOption('multiple_choice');
    await instructorPage.getByPlaceholder('Type your question').fill('Allow Multiple Responses Test');
    await instructorPage.getByPlaceholder('Option A').fill('Test Option A');
    await instructorPage.getByPlaceholder('Option B').fill('Test Option B');
    await instructorPage.locator('input[type="radio"][value="A"]').click();

    await instructorPage.getByTestId('start-discussion-button').click();
    await expect(instructorPage.getByText('Set Time Limit')).toBeVisible({ timeout: 5000 });

    // Check Allow Multiple Responses
    await instructorPage.getByRole('checkbox', { name: /Allow Multiple Responses/i }).click();
    await instructorPage.getByRole('checkbox', { name: /No Time Limit/i }).click();
    await instructorPage.getByRole('button', { name: /Start Discussion/i }).last().click();

    await expect(instructorPage.getByTestId('close-discussion-button')).toBeVisible({ timeout: 10000 });

    // 7. Student joins
    await studentPage.goto('/');
    await studentPage.getByLabel('PIN code').fill(PIN);
    await studentPage.getByRole('button', { name: 'Join' }).click();
    await expect(studentPage).toHaveURL(/\/student\//, { timeout: 30000 });

    // 8. Student submits first response
    const optionA = studentPage.locator('button', { hasText: 'Test Option A' });
    await expect(optionA).toBeVisible({ timeout: 10000 });
    await optionA.click();
    await studentPage.getByRole('button', { name: 'Submit response' }).click();

    // Verify student sees "Response submitted"
    await expect(studentPage.getByText('Response submitted')).toBeVisible({ timeout: 5000 });

    // Check that "Submit another response" button is available
    const submitAnotherBtn = studentPage.getByRole('button', { name: /Submit another response/i });
    await expect(submitAnotherBtn).toBeVisible({ timeout: 5000 });

    // 9. Click it and submit again
    await submitAnotherBtn.click();
    const optionB = studentPage.locator('button', { hasText: 'Test Option B' });
    await expect(optionB).toBeVisible({ timeout: 5000 });
    await optionB.click();
    await studentPage.getByRole('button', { name: 'Submit response' }).click();

    // Verify it was submitted again
    await expect(studentPage.getByText('Response submitted')).toBeVisible({ timeout: 5000 });
    
    // Clean up: Instructor ends lesson
    await instructorPage.getByRole('button', { name: /End Lesson/i }).first().click();
  });
});

import { test, expect } from '@playwright/test';

/**
 * UI Automation — Instructor Highlight & Hide Responses
 * Tests on the instructor session page (ActiveRightPanel).
 *
 * [US 1.36] Highlight a specific response
 *   AC1: Highlighted response appears prominently (larger, different colour, pinned)
 *   AC2: Multiple highlighted responses are distinguishable
 * [US 1.35] Hide inappropriate responses
 *   AC1: Hidden from view but remains in data
 */

const LESSON_ID = 'highlight-lesson';
const DISCUSSION_ID = 'd-hl-1';

const MOCK_RESPONSES = [
  { id: 'r1', discussion_id: DISCUSSION_ID, response_text: 'First response about pharmacokinetics', selected_option: null, created_at: '2024-01-01T10:01:00Z', is_correct: null, flagged_at: null, student_session_id: 'student-1' },
  { id: 'r2', discussion_id: DISCUSSION_ID, response_text: 'Second response about drug absorption', selected_option: null, created_at: '2024-01-01T10:02:00Z', is_correct: null, flagged_at: null, student_session_id: 'student-2' },
  { id: 'r3', discussion_id: DISCUSSION_ID, response_text: 'Third response about bioavailability', selected_option: null, created_at: '2024-01-01T10:03:00Z', is_correct: null, flagged_at: null, student_session_id: 'student-3' },
];

test.describe('Instructor Highlight & Hide Responses', () => {

  test.beforeEach(async ({ page }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgxxmqgwrvqrdbgutnpb.supabase.co';
    const projectRef = new URL(url).hostname.split('.')[0];

    // Mock Supabase Auth Cookie
    await page.context().addCookies([{
      name: `sb-${projectRef}-auth-token`,
      value: JSON.stringify({
        access_token: 'fake',
        refresh_token: 'fake',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'hl-inst', email: 'inst@hl.com' },
      }),
      domain: 'localhost',
      path: '/',
    }]);

    // Auth mocks
    await page.route('**/auth/v1/user*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'hl-inst', email: 'inst@hl.com' }) })
    );
    await page.route('**/auth/v1/session*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fake', user: { id: 'hl-inst' } }) })
    );
    await page.route('**/auth/v1/token*', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake', refresh_token: 'fake', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'hl-inst' } }),
      })
    );

    // Mock lesson
    await page.route('**/rest/v1/lessons*', async (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.includes(`id=eq.${LESSON_ID}`)) {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({
            id: LESSON_ID, title: 'Highlight Test Lesson', status: 'active',
            instructor_id: 'hl-inst', pin_code: '777777',
            courses: { instructor_id: 'hl-inst' },
          }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    // Mock discussions — one active discussion
    await page.route('**/rest/v1/discussions*', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{
          id: DISCUSSION_ID, lesson_id: LESSON_ID,
          prompt_text: 'Explain pharmacokinetics',
          prompt_type: 'short_answer', status: 'active',
          display_order: 1, created_at: '2024-01-01T10:00:00Z',
          published_at: '2024-01-01T10:00:00Z', closed_at: null,
        }]),
      })
    );

    // Mock responses — differentiate active vs flagged vs PATCH
    await page.route('**/rest/v1/responses*', async (route) => {
      const reqUrl = route.request().url();
      if (route.request().method() === 'PATCH') {
        // Flag/unflag operation — return one row so the RLS check passes
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify([{ id: 'r-patched', flagged_at: new Date().toISOString() }]),
        });
      } else if (reqUrl.includes('flagged_at=not.is.null')) {
        // Flagged responses — initially empty
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        // Active responses
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES) });
      }
    });

    // Mock other endpoints the session page may request
    await page.route('**/rest/v1/lesson_files*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.route('**/rest/v1/lesson_chunks*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    // Suppress the one-time AI tips spotlight so it doesn't block clicks in tests.
    await page.addInitScript(() => sessionStorage.setItem('ai-tips-seen-highlight-lesson', 'true'));
    // Navigate to the session page
    await page.goto(`/session/${LESSON_ID}`);
    await expect(page.getByText('Highlight Test Lesson')).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // [US 1.36] AC1 — Highlighted response appears prominently
  // ---------------------------------------------------------------------------

  test('[US 1.36][AC1-AT1] responses are visible in collapsed state by default', async ({ page }) => {
    await expect(page.getByText('First response about pharmacokinetics')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Second response about drug absorption')).toBeVisible();
    await expect(page.getByText('Third response about bioavailability')).toBeVisible();

    // Flag badge is always present on all responses (collapsed to icon; text revealed on click)
    await expect(page.getByRole('button', { name: /Flag as Inappropriate/i })).toHaveCount(3);
    // No response is in the highlighted/selected state
    await expect(page.getByLabel('Deselect response')).toHaveCount(0);
  });

  test('[US 1.36][AC1-AT2] clicking a response highlights it and shows the flag button', async ({ page }) => {
    const response = page.getByText('First response about pharmacokinetics');
    await expect(response).toBeVisible({ timeout: 10000 });

    await response.click();

    // Flag badge is always visible; verify the selected card's flag button specifically
    await expect(page.getByLabel('Deselect response').getByRole('button', { name: /Flag as Inappropriate/i })).toBeVisible();
  });

  test('[US 1.36][AC1-AT3] highlighted response shows prominent visual styling', async ({ page }) => {
    const response = page.getByText('First response about pharmacokinetics');
    await expect(response).toBeVisible({ timeout: 10000 });

    // Before highlight: base text styling
    await expect(response).not.toHaveClass(/font-semibold/);

    await response.click();

    // After highlight: prominent styling — larger text, semibold, highlighted card
    await expect(response).toHaveClass(/font-semibold/);
    await expect(response).toHaveClass(/text-2xl/);
    // data-highlighted="true" is the semantic anchor — avoids the .z-10 utility class selector
    // which breaks if the stacking-context implementation ever changes
    await expect(page.locator('[data-highlighted="true"]').first()).toBeVisible();
  });

  test('[US 1.36][AC1-AT4] un-highlighting a response returns to base styling', async ({ page }) => {
    const response = page.getByText('First response about pharmacokinetics');
    await expect(response).toBeVisible({ timeout: 10000 });

    // Highlight
    await response.click();
    await expect(response).toHaveClass(/text-2xl/);

    // Un-highlight
    await response.click();
    await expect(response).not.toHaveClass(/text-2xl/);
    await expect(response).not.toHaveClass(/font-semibold/);
    // No card is selected; flag badges still present but no card in deselect state
    await expect(page.getByLabel('Deselect response')).toHaveCount(0);
  });

  test('[US 1.36][AC1-AT5] filter toggle appears when responses are highlighted', async ({ page }) => {
    await expect(page.getByText('First response about pharmacokinetics')).toBeVisible({ timeout: 10000 });

    // Toggle should not exist initially
    await expect(page.getByRole('button', { name: /Show highlighted only/i })).toHaveCount(0);

    // Highlight a response
    await page.getByText('First response about pharmacokinetics').click();

    await expect(page.getByRole('button', { name: /Show highlighted only \(1\)/i })).toBeVisible();
  });

  test('[US 1.36][AC1-AT6] filter toggle shows only highlighted responses', async ({ page }) => {
    const first = page.getByText('First response about pharmacokinetics');
    await expect(first).toBeVisible({ timeout: 10000 });

    // Highlight first response
    await first.click();

    // Activate filter
    await page.getByRole('button', { name: /Show highlighted only/i }).click();

    // Only highlighted response visible
    await expect(first).toBeVisible();
    await expect(page.getByText('Second response about drug absorption')).not.toBeVisible();
    await expect(page.getByText('Third response about bioavailability')).not.toBeVisible();
  });

  test('[US 1.36][AC1-AT7] "Show all" button restores full response list', async ({ page }) => {
    const first = page.getByText('First response about pharmacokinetics');
    await expect(first).toBeVisible({ timeout: 10000 });

    // Highlight and filter
    await first.click();
    await page.getByRole('button', { name: /Show highlighted only/i }).click();
    await expect(page.getByText('Second response about drug absorption')).not.toBeVisible();

    // Show all
    await page.getByRole('button', { name: /Show all/i }).click();

    await expect(page.getByText('First response about pharmacokinetics')).toBeVisible();
    await expect(page.getByText('Second response about drug absorption')).toBeVisible();
    await expect(page.getByText('Third response about bioavailability')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // [US 1.36] AC2 — Multiple highlighted responses are distinguishable
  // ---------------------------------------------------------------------------

  test('[US 1.36][AC2-AT1] multiple responses can be highlighted simultaneously', async ({ page }) => {
    const first = page.getByText('First response about pharmacokinetics');
    const third = page.getByText('Third response about bioavailability');
    await expect(first).toBeVisible({ timeout: 10000 });

    await first.click();
    await third.click();

    // Both responses are in the selected/deselect state
    await expect(page.getByLabel('Deselect response')).toHaveCount(2);
  });

  test('[US 1.36][AC2-AT2] each highlighted response has its own prominent styling', async ({ page }) => {
    const first = page.getByText('First response about pharmacokinetics');
    const second = page.getByText('Second response about drug absorption');
    const third = page.getByText('Third response about bioavailability');
    await expect(first).toBeVisible({ timeout: 10000 });

    await first.click();
    await third.click();

    // Both highlighted responses have prominent styling
    await expect(first).toHaveClass(/text-2xl/);
    await expect(first).toHaveClass(/font-semibold/);
    await expect(third).toHaveClass(/text-2xl/);
    await expect(third).toHaveClass(/font-semibold/);

    // Non-highlighted response stays in base styling
    await expect(second).not.toHaveClass(/text-2xl/);
    await expect(second).not.toHaveClass(/font-semibold/);
  });

  test('[US 1.36][AC2-AT3] deselecting one response keeps the other highlighted', async ({ page }) => {
    const first = page.getByText('First response about pharmacokinetics');
    const third = page.getByText('Third response about bioavailability');
    await expect(first).toBeVisible({ timeout: 10000 });

    // Highlight both
    await first.click();
    await third.click();
    await expect(page.getByLabel('Deselect response')).toHaveCount(2);

    // Deselect first
    await first.click();
    await expect(page.getByLabel('Deselect response')).toHaveCount(1);
    await expect(third).toHaveClass(/text-2xl/);
    await expect(first).not.toHaveClass(/text-2xl/);
  });

  // ---------------------------------------------------------------------------
  // [US 1.35] AC1 — Hidden from view but remains in data
  // ---------------------------------------------------------------------------

  test('[US 1.35][AC1-AT1] flagging a response hides it from the visible list', async ({ page }) => {
    const response = page.getByText('Second response about drug absorption');
    await expect(response).toBeVisible({ timeout: 10000 });

    // Select response, then two-click its flag button (expand then confirm)
    await response.click();
    const flagBtn = page.getByLabel('Deselect response').getByRole('button', { name: /Flag as Inappropriate/i });
    await flagBtn.click(); // expand
    await flagBtn.click(); // confirm flag

    // Flagged response should disappear
    await expect(response).not.toBeVisible({ timeout: 5000 });

    // Other responses remain visible
    await expect(page.getByText('First response about pharmacokinetics')).toBeVisible();
    await expect(page.getByText('Third response about bioavailability')).toBeVisible();
  });

  test('[US 1.35][AC1-AT2] flagged responses can be viewed and restored via toggle', async ({ page }) => {
    // 1. Initial State: all 3 visible
    const secondResponse = page.getByText('Second response about drug absorption');
    await expect(secondResponse).toBeVisible({ timeout: 10000 });

    // 2. Select and two-click flag (expand then confirm)
    await secondResponse.click();
    const flagBtn = page.getByLabel('Deselect response').getByRole('button', { name: /Flag as Inappropriate/i });
    await flagBtn.click(); // expand
    await flagBtn.click(); // confirm flag
    await expect(secondResponse).not.toBeVisible();

    // 3. Toggle flagged view
    const showFlaggedBtn = page.getByRole('button', { name: /Show flagged/i });
    await expect(showFlaggedBtn).toBeVisible();
    await showFlaggedBtn.click();

    // 4. Verify flagged view shows the hidden response and hides normal responses
    await expect(secondResponse).toBeVisible();
    await expect(page.getByText('First response about pharmacokinetics')).not.toBeVisible();
    await expect(page.getByText('Third response about bioavailability')).not.toBeVisible();

    // 5. Restore: select and two-click unflag (expand then confirm)
    await secondResponse.click();
    const unflagBtn = page.getByLabel('Deselect response').getByRole('button', { name: /Unflag/i });
    await unflagBtn.click(); // expand
    await unflagBtn.click(); // confirm unflag

    // 6. Verify automatically returns to normal view and all 3 are visible again
    await expect(page.getByText('First response about pharmacokinetics')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Second response about drug absorption')).toBeVisible();
    await expect(page.getByText('Third response about bioavailability')).toBeVisible();
  });
});

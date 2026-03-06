/**
 * Unit Tests — Multiple-Choice Feedback Logic
 * User Story [US 2.10]: To see if I got multiple choice questions correct
 *
 * These tests verify the pure business-logic layer that lives inside
 * StudentSessionPage.handleSubmit():
 *  - Identifying whether an MC answer is correct
 *  - Building the response text payload sent to submitResponse()
 *  - Branch conditions guarding feedback rendering
 */

// ---------------------------------------------------------------------------
// Helpers that mirror the logic in StudentSessionPage exactly.
// Tests verify these helpers — changes here should mirror component changes.
// ---------------------------------------------------------------------------

/**
 * Given a selected option label and the discussion's correct_option,
 * returns whether the selection is correct.
 * Mirrors: const isCorrect = selectedOption === activeDiscussion?.correct_option;
 */
function isMCAnswerCorrect(selectedOption: string | null, correctOption: string | null): boolean {
    if (!selectedOption || !correctOption) return false;
    return selectedOption === correctOption;
}

/**
 * Builds the text that is stored as the student's response_text.
 * Mirrors: submitResponse(`Option ${selectedOption}: ${optionText}`, …)
 */
function buildMCResponseText(
    selectedLabel: string,
    options: { label: string; text: string }[]
): string {
    const optionText = options.find(o => o.label === selectedLabel)?.text ?? '';
    return `Option ${selectedLabel}: ${optionText}`;
}

/**
 * Returns whether the correctness feedback block should be rendered.
 * Mirrors the condition on line 158 of StudentSessionPage.tsx:
 *   activeDiscussion?.feedback_enabled && isMC && isSubmitCorrect !== null
 */
function shouldShowFeedback(
    feedbackEnabled: boolean,
    isMC: boolean,
    isSubmitCorrect: boolean | null
): boolean {
    return feedbackEnabled && isMC && isSubmitCorrect !== null;
}

/**
 * Returns the display message shown to the student after submission.
 * Mirrors lines 161-167 of StudentSessionPage.tsx.
 */
function getFeedbackMessage(
    isCorrect: boolean,
    correctOption: string
): { headline: string; detail: string } {
    if (isCorrect) {
        return { headline: '✅ Correct!', detail: 'You selected the correct answer.' };
    }
    return { headline: '❌ Incorrect', detail: `Correct Answer: Option ${correctOption}` };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MC Feedback Logic — Unit Tests [US 2.10]', () => {

    // -------------------------------------------------------------------------
    // isMCAnswerCorrect
    // -------------------------------------------------------------------------
    describe('isMCAnswerCorrect()', () => {

        // 30.1
        it('[US 2.10][UT1] success: returns true when selected option matches correct_option', () => {
            expect(isMCAnswerCorrect('B', 'B')).toBe(true);
        });

        // 30.2
        it('[US 2.10][UT2] failure: returns false when selected option does not match correct_option', () => {
            expect(isMCAnswerCorrect('A', 'B')).toBe(false);
        });

        // 30.3
        it('[US 2.10][UT3] failure: returns false when correct_option is null (no answer key set)', () => {
            expect(isMCAnswerCorrect('A', null)).toBe(false);
        });

        // 30.4
        it('[US 2.10][UT4] failure: returns false when selectedOption is null (nothing selected)', () => {
            expect(isMCAnswerCorrect(null, 'A')).toBe(false);
        });

        // 30.5
        it('[US 2.10][UT5] failure: returns false when both arguments are null', () => {
            expect(isMCAnswerCorrect(null, null)).toBe(false);
        });

        // 30.6
        it('[US 2.10][UT6] success: comparison is case-sensitive — A vs a are different', () => {
            // Option labels from the DB are always uppercase single letters
            expect(isMCAnswerCorrect('a', 'A')).toBe(false);
        });

        // 30.7
        it('[US 2.10][UT7] success: evaluates all four typical option labels correctly', () => {
            const correctOption = 'C';
            expect(isMCAnswerCorrect('A', correctOption)).toBe(false);
            expect(isMCAnswerCorrect('B', correctOption)).toBe(false);
            expect(isMCAnswerCorrect('C', correctOption)).toBe(true);
            expect(isMCAnswerCorrect('D', correctOption)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // buildMCResponseText
    // -------------------------------------------------------------------------
    describe('buildMCResponseText()', () => {
        const options = [
            { label: 'A', text: 'Browser testing' },
            { label: 'B', text: 'A text editor' },
            { label: 'C', text: 'A linting tool' },
            { label: 'D', text: 'A CI service' },
        ];

        // 30.8
        it('[US 2.10][UT8] success: builds correct response string for option A', () => {
            expect(buildMCResponseText('A', options)).toBe('Option A: Browser testing');
        });

        // 30.9
        it('[US 2.10][UT9] success: builds correct response string for option B', () => {
            expect(buildMCResponseText('B', options)).toBe('Option B: A text editor');
        });

        // 30.10
        it('[US 2.10][UT10] failure: falls back to empty string if option label not found', () => {
            expect(buildMCResponseText('Z', options)).toBe('Option Z: ');
        });

        // 30.11
        it('[US 2.10][UT11] success: returns correct format with empty options array', () => {
            expect(buildMCResponseText('A', [])).toBe('Option A: ');
        });
    });

    // -------------------------------------------------------------------------
    // shouldShowFeedback
    // -------------------------------------------------------------------------
    describe('shouldShowFeedback()', () => {

        // 30.12
        it('[US 2.10][UT12] success: shows feedback when enabled, MC, and result is known', () => {
            expect(shouldShowFeedback(true, true, true)).toBe(true);
            expect(shouldShowFeedback(true, true, false)).toBe(true);
        });

        // 30.13
        it('[US 2.10][UT13] failure: hides feedback when feedback_enabled is false', () => {
            expect(shouldShowFeedback(false, true, true)).toBe(false);
            expect(shouldShowFeedback(false, true, false)).toBe(false);
        });

        // 30.14
        it('[US 2.10][UT14] failure: hides feedback when question is not MC (isMC=false)', () => {
            expect(shouldShowFeedback(true, false, true)).toBe(false);
        });

        // 30.15
        it('[US 2.10][UT15] failure: hides feedback when result is null (not yet submitted)', () => {
            expect(shouldShowFeedback(true, true, null)).toBe(false);
        });

        // 30.16
        it('[US 2.10][UT16] failure: all three conditions false means no feedback', () => {
            expect(shouldShowFeedback(false, false, null)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // getFeedbackMessage
    // -------------------------------------------------------------------------
    describe('getFeedbackMessage()', () => {

        // 30.17
        it('[US 2.10][UT17] success: correct answer shows confirmation headline', () => {
            const { headline, detail } = getFeedbackMessage(true, 'B');
            expect(headline).toBe('✅ Correct!');
            expect(detail).toBe('You selected the correct answer.');
        });

        // 30.18
        it('[US 2.10][UT18] failure: incorrect answer shows error headline', () => {
            const { headline } = getFeedbackMessage(false, 'B');
            expect(headline).toBe('❌ Incorrect');
        });

        // 30.19
        it('[US 2.10][UT19] failure: incorrect answer reveals the correct option label', () => {
            const { detail } = getFeedbackMessage(false, 'B');
            expect(detail).toBe('Correct Answer: Option B');
        });

        // 30.20
        it('[US 2.10][UT20] failure: correct option label varies with the actual correct answer', () => {
            expect(getFeedbackMessage(false, 'D').detail).toBe('Correct Answer: Option D');
            expect(getFeedbackMessage(false, 'A').detail).toBe('Correct Answer: Option A');
        });
    });
});

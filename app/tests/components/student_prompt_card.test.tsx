/**
 * Component Tests — StudentPromptCard
 * User Story [US 2.10]: To see if I got multiple choice questions correct
 *
 * These tests verify the StudentPromptCard component in isolation:
 * - Renders MC options correctly from the discussion data
 * - Highlights the selected option
 * - Calls onSelectOption when a button is clicked
 * - Does NOT render option buttons for non-MC questions
 *
 * NOTE: The prompt card deliberately strips is_correct from mc_options
 * (the type MCOptionSafe has no is_correct field), so the card never
 * leaks the answer — security requirement from US 2.10 comments.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentPromptCard } from '@/components/student/session/StudentPromptCard';
import type { Discussion } from '@/types/discussion';

// Fixtures
const mcDiscussion: Discussion = {
    id: 'd1',
    lesson_id: 'lesson-1',
    prompt_text: 'What does PMCOL stand for?',
    prompt_type: 'multiple_choice',
    status: 'active',
    created_at: new Date().toISOString(),
    published_at: null,
    closed_at: null,
    display_order: 1,
    source: null,
    mc_options: [
        { label: 'A', text: 'Pharmacology' },
        { label: 'B', text: 'Philosophy' },
        { label: 'C', text: 'Physics' },
        { label: 'D', text: 'Physiology' },
    ],
    correct_option: 'A',     // Exists in the DB object...
    feedback_enabled: true,
    ai_generated_correct_option: null,
};

const shortAnswerDiscussion: Discussion = {
    ...mcDiscussion,
    id: 'd2',
    prompt_type: 'short_answer',
    mc_options: null,
    correct_option: null,
    feedback_enabled: false,
};

// Tests

describe('StudentPromptCard Component Tests [US 2.10]', () => {

    // Rendering MC options
    describe('MC option rendering', () => {

        // 30.1
        it('[US 2.10][CT1] success: renders the prompt text', () => {
            render(<StudentPromptCard discussion={mcDiscussion} />);
            expect(screen.getByText('What does PMCOL stand for?')).toBeInTheDocument();
        });

        // 30.2
        it('[US 2.10][CT2] success: renders all four option buttons', () => {
            render(<StudentPromptCard discussion={mcDiscussion} />);
            expect(screen.getByText('A.')).toBeInTheDocument();
            expect(screen.getByText('B.')).toBeInTheDocument();
            expect(screen.getByText('C.')).toBeInTheDocument();
            expect(screen.getByText('D.')).toBeInTheDocument();
        });

        // 30.3
        it('[US 2.10][CT3] success: renders option text alongside each option label', () => {
            render(<StudentPromptCard discussion={mcDiscussion} />);
            expect(screen.getByText('Pharmacology')).toBeInTheDocument();
            expect(screen.getByText('Philosophy')).toBeInTheDocument();
            expect(screen.getByText('Physics')).toBeInTheDocument();
            expect(screen.getByText('Physiology')).toBeInTheDocument();
        });

        // 30.4
        it('[US 2.10][CT4] failure: renders no option buttons for short-answer question', () => {
            render(<StudentPromptCard discussion={shortAnswerDiscussion} />);
            expect(screen.queryByText('A.')).not.toBeInTheDocument();
        });

        // 30.5
        it('[US 2.10][CT5] failure: renders no option buttons when mc_options is empty array', () => {
            const emptyOptionsMC = { ...mcDiscussion, mc_options: [] };
            render(<StudentPromptCard discussion={emptyOptionsMC} />);
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    // Option selection
    describe('Option selection callbacks', () => {

        // 30.6
        it('[US 2.10][CT6] success: clicking an option calls onSelectOption with correct label', () => {
            const onSelectOption = jest.fn();
            render(<StudentPromptCard discussion={mcDiscussion} onSelectOption={onSelectOption} />);
            fireEvent.click(screen.getByText('B.'));
            expect(onSelectOption).toHaveBeenCalledWith('B');
        });

        // 30.7
        it('[US 2.10][CT7] success: clicking a different option calls onSelectOption with that label', () => {
            const onSelectOption = jest.fn();
            render(<StudentPromptCard discussion={mcDiscussion} onSelectOption={onSelectOption} />);
            fireEvent.click(screen.getByText('D.'));
            expect(onSelectOption).toHaveBeenCalledWith('D');
        });

        // 30.8
        it('[US 2.10][CT8] success: does not throw when onSelectOption is not provided', () => {
            render(<StudentPromptCard discussion={mcDiscussion} />);
            // No callback provided — should not throw
            expect(() => fireEvent.click(screen.getByText('A.'))).not.toThrow();
        });
    });

    // Visual selected-state
    describe('Selected option styling', () => {

        // 30.9
        it('[US 2.10][CT9] success: selected option button has dark background class', () => {
            render(
                <StudentPromptCard
                    discussion={mcDiscussion}
                    selectedOption="A"
                    onSelectOption={jest.fn()}
                />
            );
            // The selected button should contain 'bg-black' class
            const optionButtons = screen.getAllByRole('button');
            const selectedBtn = optionButtons.find(btn =>
                btn.textContent?.includes('A.')
            );
            expect(selectedBtn?.className).toMatch(/bg-black/);
        });

        // 30.10
        it('[US 2.10][CT10] success: non-selected options do NOT have dark background class', () => {
            render(
                <StudentPromptCard
                    discussion={mcDiscussion}
                    selectedOption="A"
                    onSelectOption={jest.fn()}
                />
            );
            const optionButtons = screen.getAllByRole('button');
            const unselectedBtn = optionButtons.find(btn => btn.textContent?.includes('B.'));
            expect(unselectedBtn?.className).not.toMatch(/bg-black/);
        });

        // 30.11
        it('[US 2.10][CT11] success: no option has highlight when selectedOption is null', () => {
            render(
                <StudentPromptCard
                    discussion={mcDiscussion}
                    selectedOption={null}
                    onSelectOption={jest.fn()}
                />
            );
            const optionButtons = screen.getAllByRole('button');
            optionButtons.forEach(btn => {
                expect(btn.className).not.toMatch(/bg-black/);
            });
        });
    });

    // Security — correct_option is not exposed in the rendered HTML
    describe('Security: correct answer not leaked to the DOM [US 2.10]', () => {

        // 30.12
        it('[US 2.10][SEC1] success: correct_option value ("A") not rendered as text with "correct" label', () => {
            const { container } = render(
                <StudentPromptCard discussion={mcDiscussion} />
            );
            // The DOM should not contain text like "correct: A" or "(correct)" near an option
            expect(container.innerHTML).not.toMatch(/is_correct/i);
            expect(container.innerHTML).not.toMatch(/Correct Option/i);
        });

        // 30.13
        it('[US 2.10][SEC2] success: card renders identically for all options — no answer hint in DOM', () => {
            const { container } = render(
                <StudentPromptCard discussion={mcDiscussion} />
            );
            // All option buttons should have the same base className structure
            const buttons = container.querySelectorAll('button');
            const classNames = Array.from(buttons).map(b => b.className);
            // All start non-selected, so all should share the same base style
            classNames.forEach(cls => expect(cls).toMatch(/border-gray-200/));
        });
    });
});

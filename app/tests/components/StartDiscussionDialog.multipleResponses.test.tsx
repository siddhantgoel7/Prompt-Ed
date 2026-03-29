/**
 * Component Tests — StartDiscussionDialog (Multiple Responses)
 * User Story [US 1.30]: Allow multiple responses from students
 *
 * Tests the "Allow Multiple Responses" toggle and response limit
 * controls within the StartDiscussionDialog:
 * - Toggle is hidden for multiple choice questions
 * - Toggle is visible for short/long answer questions
 * - Response limit sub-option appears when toggle is enabled
 * - onConfirm receives correct MultipleResponseSettings
 * - Default state is single response (allow_multiple_responses=false)
 */

import React from 'react';
import { render, screen, fireEvent } from '../utils/renderWithProviders';
import { StartDiscussionDialog } from '@/components/instructor/session/StartDiscussionDialog';

function renderDialog(
    onConfirm = jest.fn(),
    onCancel = jest.fn(),
    isMultipleChoice = false,
) {
    return render(
        <StartDiscussionDialog
            open={true}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isMultipleChoice={isMultipleChoice}
        />
    );
}

describe('StartDiscussionDialog Multiple Responses [US 1.30]', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('Toggle visibility', () => {

        // 71.1
        it('[US 1.30][CT1] success: shows Allow Multiple Responses checkbox for non-MC questions', () => {
            renderDialog(jest.fn(), jest.fn(), false);
            expect(screen.getByTestId('allow-multiple-responses-checkbox')).toBeInTheDocument();
            expect(screen.getByText('Allow Multiple Responses')).toBeInTheDocument();
        });

        // 71.2
        it('[US 1.30][CT2] success: hides Allow Multiple Responses checkbox for MC questions', () => {
            renderDialog(jest.fn(), jest.fn(), true);
            expect(screen.queryByTestId('allow-multiple-responses-checkbox')).not.toBeInTheDocument();
            expect(screen.queryByText('Allow Multiple Responses')).not.toBeInTheDocument();
        });

        // 71.3
        it('[US 1.30][CT3] success: Allow Multiple Responses is unchecked by default', () => {
            renderDialog();
            const checkbox = screen.getByTestId('allow-multiple-responses-checkbox');
            expect(checkbox).not.toBeChecked();
        });
    });

    describe('Toggle interaction', () => {

        // 71.4
        it('[US 1.30][CT4] success: clicking Allow Multiple Responses toggles it on', () => {
            renderDialog();
            const checkbox = screen.getByTestId('allow-multiple-responses-checkbox');
            fireEvent.click(checkbox);
            expect(checkbox).toBeChecked();
        });

        // 71.5
        it('[US 1.30][CT5] success: response limit checkbox appears when Allow Multiple Responses is enabled', () => {
            renderDialog();
            fireEvent.click(screen.getByTestId('allow-multiple-responses-checkbox'));
            expect(screen.getByTestId('response-limit-checkbox')).toBeInTheDocument();
            expect(screen.getByText('Limit responses per student')).toBeInTheDocument();
        });

        // 71.6
        it('[US 1.30][CT6] success: response limit input appears when limit checkbox is checked', () => {
            renderDialog();
            fireEvent.click(screen.getByTestId('allow-multiple-responses-checkbox'));
            fireEvent.click(screen.getByTestId('response-limit-checkbox'));
            expect(screen.getByTestId('response-limit-input')).toBeInTheDocument();
        });

        // 71.7
        it('[US 1.30][CT7] success: response limit input defaults to 3', () => {
            renderDialog();
            fireEvent.click(screen.getByTestId('allow-multiple-responses-checkbox'));
            fireEvent.click(screen.getByTestId('response-limit-checkbox'));
            const input = screen.getByTestId('response-limit-input') as HTMLInputElement;
            expect(input.value).toBe('3');
        });
    });

    describe('onConfirm payload', () => {

        // 71.8
        it('[US 1.30][CT8] success: confirming with defaults sends allowMultipleResponses=false', () => {
            const onConfirm = jest.fn();
            renderDialog(onConfirm);
            // Check No Time Limit to simplify assertion
            fireEvent.click(screen.getByTestId('no-time-limit-checkbox'));
            fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));
            expect(onConfirm).toHaveBeenCalledWith(null, {
                allowMultipleResponses: false,
                responseLimit: null,
            });
        });

        // 71.9
        it('[US 1.30][CT9] success: confirming with Allow Multiple Responses sends allowMultipleResponses=true, responseLimit=null', () => {
            const onConfirm = jest.fn();
            renderDialog(onConfirm);
            fireEvent.click(screen.getByTestId('no-time-limit-checkbox'));
            fireEvent.click(screen.getByTestId('allow-multiple-responses-checkbox'));
            fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));
            expect(onConfirm).toHaveBeenCalledWith(null, {
                allowMultipleResponses: true,
                responseLimit: null,
            });
        });

        // 71.10
        it('[US 1.30][CT10] success: confirming with response limit sends correct responseLimit value', () => {
            const onConfirm = jest.fn();
            renderDialog(onConfirm);
            fireEvent.click(screen.getByTestId('no-time-limit-checkbox'));
            fireEvent.click(screen.getByTestId('allow-multiple-responses-checkbox'));
            fireEvent.click(screen.getByTestId('response-limit-checkbox'));
            fireEvent.change(screen.getByTestId('response-limit-input'), { target: { value: '5' } });
            fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));
            expect(onConfirm).toHaveBeenCalledWith(null, {
                allowMultipleResponses: true,
                responseLimit: 5,
            });
        });

        // 71.11
        it('[US 1.30][CT11] success: MC dialog onConfirm does not include multiple response settings toggle', () => {
            const onConfirm = jest.fn();
            renderDialog(onConfirm, jest.fn(), true);
            fireEvent.click(screen.getByTestId('no-time-limit-checkbox'));
            fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));
            expect(onConfirm).toHaveBeenCalledWith(null, {
                allowMultipleResponses: false,
                responseLimit: null,
            });
        });
    });

    describe('State reset', () => {

        // 71.12
        it('[US 1.30][CT12] success: reopening dialog resets multiple response settings', () => {
            const onConfirm = jest.fn();
            const { rerender } = render(
                <StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={jest.fn()} />
            );
            // Enable multiple responses
            fireEvent.click(screen.getByTestId('allow-multiple-responses-checkbox'));
            expect(screen.getByTestId('allow-multiple-responses-checkbox')).toBeChecked();

            // Close and reopen
            rerender(
                <StartDiscussionDialog open={false} onConfirm={onConfirm} onCancel={jest.fn()} />
            );
            rerender(
                <StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={jest.fn()} />
            );

            // Should be reset to unchecked
            expect(screen.getByTestId('allow-multiple-responses-checkbox')).not.toBeChecked();
        });
    });
});

/**
 * Component Tests — StartDiscussionDialog [US 1.29]
 *
 * Tests the timer-setting dialog shown when the instructor clicks "Start Discussion".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartDiscussionDialog } from '@/components/instructor/session/StartDiscussionDialog';

function renderDialog(onConfirm = jest.fn(), onCancel = jest.fn()) {
    return render(
        <StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />
    );
}

describe('StartDiscussionDialog [US 1.29]', () => {
    beforeEach(() => jest.clearAllMocks());

    // 66.1
    it('[US 1.29][UNIT1] success: dialog renders when open=true', () => {
        renderDialog();
        expect(screen.getByText('Set Time Limit')).toBeInTheDocument();
    });

    // 66.2
    it('[US 1.29][UNIT2] success: default timer is 1 minute (minutes=1, seconds=0)', () => {
        renderDialog();
        const minInput = screen.getByTestId('timer-minutes') as HTMLInputElement;
        const secInput = screen.getByTestId('timer-seconds') as HTMLInputElement;
        expect(minInput.value).toBe('1');
        expect(secInput.value).toBe('0');
    });

    // 66.3
    it('[US 1.29][UNIT3] success: "No Time Limit" checkbox is unchecked by default', () => {
        renderDialog();
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    // 66.4
    it('[US 1.29][UNIT4] success: clicking No Time Limit toggles the checkbox on', () => {
        renderDialog();
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    // 66.5
    it('[US 1.29][UNIT5] success: confirming with default (1 min) calls onConfirm(60)', () => {
        const onConfirm = jest.fn();
        renderDialog(onConfirm);
        fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));
        expect(onConfirm).toHaveBeenCalledWith(60);
    });

    // 66.6
    it('[US 1.29][UNIT6] success: confirming with No Time Limit calls onConfirm(null)', () => {
        const onConfirm = jest.fn();
        renderDialog(onConfirm);
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));
        expect(onConfirm).toHaveBeenCalledWith(null);
    });

    // 66.7
    it('[US 1.29][UNIT7] success: setting minutes=2, seconds=30 calls onConfirm(150)', () => {
        const onConfirm = jest.fn();
        renderDialog(onConfirm);
        fireEvent.change(screen.getByTestId('timer-minutes'), { target: { value: '2' } });
        fireEvent.change(screen.getByTestId('timer-seconds'), { target: { value: '30' } });
        fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));
        expect(onConfirm).toHaveBeenCalledWith(150);
    });

    // 66.8
    it('[US 1.29][UNIT8] success: Cancel button calls onCancel', () => {
        const onCancel = jest.fn();
        renderDialog(jest.fn(), onCancel);
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });

    // 66.9
    it('[US 1.29][UNIT9] failure: Start Discussion button disabled when minutes=0, seconds=0 and no limit unchecked', () => {
        renderDialog();
        fireEvent.change(screen.getByTestId('timer-minutes'), { target: { value: '0' } });
        fireEvent.change(screen.getByTestId('timer-seconds'), { target: { value: '0' } });
        const startBtn = screen.getByRole('button', { name: /Start Discussion/i });
        expect(startBtn).toBeDisabled();
    });

    // 66.10
    it('[US 1.29][UNIT10] success: Start Discussion button enabled when No Time Limit is checked even if inputs are zero', () => {
        renderDialog();
        fireEvent.change(screen.getByTestId('timer-minutes'), { target: { value: '0' } });
        fireEvent.change(screen.getByTestId('timer-seconds'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('checkbox'));
        const startBtn = screen.getByRole('button', { name: /Start Discussion/i });
        expect(startBtn).not.toBeDisabled();
    });

    // 66.11
    it('[US 1.29][UNIT11] success: dialog does not render when open=false', () => {
        render(<StartDiscussionDialog open={false} onConfirm={jest.fn()} onCancel={jest.fn()} />);
        expect(screen.queryByText('Set Time Limit')).not.toBeInTheDocument();
    });

    // 66.12
    it('[US 1.29][UNIT12] success: default confirm button label is "Start Discussion"', () => {
        renderDialog();
        expect(screen.getByRole('button', { name: /Start Discussion/i })).toBeInTheDocument();
    });

    // 66.13
    it('[US 1.29][UNIT13] success: custom confirmLabel overrides button text', () => {
        render(
            <StartDiscussionDialog
                open={true}
                onConfirm={jest.fn()}
                onCancel={jest.fn()}
                confirmLabel="Update Timer"
            />
        );
        expect(screen.getByRole('button', { name: /Update Timer/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Start Discussion/i })).not.toBeInTheDocument();
    });

    // 66.14
    it('[US 1.29][UNIT14] success: custom confirmLabel button still calls onConfirm correctly', () => {
        const onConfirm = jest.fn();
        render(
            <StartDiscussionDialog
                open={true}
                onConfirm={onConfirm}
                onCancel={jest.fn()}
                confirmLabel="Update Timer"
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Update Timer/i }));
        expect(onConfirm).toHaveBeenCalledWith(60); // default 1 minute
    });
});

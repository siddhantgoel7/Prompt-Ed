import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '../utils/renderWithProviders';
import '@testing-library/jest-dom';
import { AIPreferencesDialog } from '@/components/instructor/session/AIPreferencesDialog';
import { useAIPreferences } from '@/hooks/useAIPreferences';

// Mock the hook
jest.mock('@/hooks/useAIPreferences', () => ({
    useAIPreferences: jest.fn(),
}));

// Mock window.matchMedia for Dialog if necessary, or polyfill in jest.setup.
// The shadcn Dialog requires Radix UI Dialog which has ResizeObserver issues, handled in standard setups.

describe('AIPreferencesDialog Component [US 1.22]', () => {
    let mockSavePreferences: jest.Mock;

    beforeEach(() => {
        mockSavePreferences = jest.fn().mockResolvedValue(true);

        (useAIPreferences as jest.Mock).mockReturnValue({
            preferences: {
                difficulty: 'intermediate',
                style: 'socratic',
                length: 'standard',
                focusAreas: 'mocked focus area',
            },
            savePreferences: mockSavePreferences,
            isLoading: false,
        });

        jest.clearAllMocks();
    });

    it('[US 1.22][COMP1] success: renders button and opens dialog with populated settings', async () => {
        render(<AIPreferencesDialog />);

        const triggerButton = screen.getByRole('button', { name: /Settings/i });
        expect(triggerButton).toBeInTheDocument();

        fireEvent.click(triggerButton);

        const dialogTitle = await screen.findByRole('heading', { name: 'AI Generation Preferences' });
        expect(dialogTitle).toBeInTheDocument();

        // Check defaults populated from mocked hook
        // Use getByRole to avoid ambiguity with tooltip text that also contains "Difficulty"
        const difficultySelect = screen.getByRole('combobox', { name: /Difficulty/i }) as HTMLSelectElement;
        expect(difficultySelect.value).toBe('intermediate');

        const focusAreaTextarea = screen.getByRole('textbox', { name: /Focus Areas/i }) as HTMLTextAreaElement;
        expect(focusAreaTextarea.value).toBe('mocked focus area');
    });

    it('[US 1.22][COMP2] success: modifies settings and calls save gracefully', async () => {
        render(<AIPreferencesDialog />);
        fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

        await screen.findByRole('heading', { name: 'AI Generation Preferences' });

        const difficultySelect = screen.getByRole('combobox', { name: /Difficulty/i });
        fireEvent.change(difficultySelect, { target: { value: 'advanced' } });

        const styleSelect = screen.getByRole('combobox', { name: /Style/i });
        fireEvent.change(styleSelect, { target: { value: 'factual' } });

        const lengthSelect = screen.getByRole('combobox', { name: /Length/i });
        fireEvent.change(lengthSelect, { target: { value: 'brief' } });

        const saveButton = screen.getByRole('button', { name: 'Save Settings' });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockSavePreferences).toHaveBeenCalledWith({
                difficulty: 'advanced',
                style: 'factual',
                length: 'brief',
                focusAreas: 'mocked focus area',
            });
        });
    });

    it('[US 1.22][COMP3] success: shows loading state when preferences are loading', async () => {
        (useAIPreferences as jest.Mock).mockReturnValue({
            preferences: {},
            savePreferences: mockSavePreferences,
            isLoading: true,
        });

        render(<AIPreferencesDialog />);
        fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

        // Loading state shows dot bounce animation instead of text
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeInTheDocument();
        // data-testid="loading-dots" is the semantic anchor — avoids counting .rounded-full elements
        // (which would break if any other rounded element is added to the dialog)
        expect(screen.getByTestId('loading-dots')).toBeInTheDocument();
    });
});

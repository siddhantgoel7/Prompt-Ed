import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ActiveCenter } from '@/components/instructor/session/ActiveCenter';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { transcribeAudioApi } from '@/lib/api/aiApi';

jest.mock('@/hooks/useAudioRecorder', () => ({
  useAudioRecorder: jest.fn(),
}));

jest.mock('@/hooks/useAIPreferences', () => ({
  useAIPreferences: jest.fn().mockReturnValue({ preferences: { focusAreas: '' } }),
}));

jest.mock('@/hooks/useDebugSweep', () => ({
  useDebugSweep: jest.fn().mockReturnValue({
    handleCopyReport: jest.fn(),
    handleRunAllCombinations: jest.fn(),
  }),
}));

jest.mock('@/lib/api/aiApi', () => ({
  transcribeAudioApi: jest.fn(),
  generateCandidatesApi: jest.fn(),
}));

jest.mock('@/components/instructor/session/AITipsButton', () => ({
  AITipsButton: () => <div data-testid="tips-btn" />,
}));

jest.mock('@/components/instructor/session/AIPreferencesDialog', () => ({
  AIPreferencesDialog: () => <div data-testid="prefs-dialog" />,
}));

jest.mock('@/components/instructor/session/CandidateCard', () => ({
  CandidateCard: ({ onSelect }: any) => <button onClick={onSelect} data-testid="candidate-card" />,
}));

describe('ActiveCenter', () => {
    const defaultProps = {
        lessonId: 'l1',
        isConnected: true,
        isGenerating: false,
        candidates: [],
        activeDiscussionId: null,
        onGenerate: jest.fn(),
        onRegenerate: jest.fn(),
        onPublish: jest.fn(),
        onPublishAiCandidate: jest.fn(),
        onSelectCandidate: jest.fn(),
        generationWarning: null,
        promptInput: '',
        setPromptInput: jest.fn(),
        transcriptText: '',
        setTranscriptText: jest.fn(),
        promptType: 'long_answer' as const,
        setPromptType: jest.fn(),
    };

    const mockRecorder = {
        isRecording: false,
        elapsed: 0,
        fmt: jest.fn().mockReturnValue('0:00'),
        start: jest.fn(),
        stop: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'audio/webm' })),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAudioRecorder as jest.Mock).mockReturnValue(mockRecorder);
    });

    it('success: renders and handles manual input', () => {
        render(<ActiveCenter {...defaultProps} />);
        
        const textarea = screen.getByPlaceholderText(/Spoken content will appear/i);
        fireEvent.change(textarea, { target: { value: 'Manual Question' } });
        
        expect(textarea).toHaveValue('Manual Question');
    });

    it('success: handles audio recording and transcription', async () => {
        (transcribeAudioApi as jest.Mock).mockResolvedValue('Transcribed Content');
        
        const stopRecorder = { ...mockRecorder, isRecording: true };
        (useAudioRecorder as jest.Mock).mockReturnValue(stopRecorder);
        
        render(<ActiveCenter {...defaultProps} />); 
        
        const stopBtn = screen.getByText(/Stop & Transcribe/i);
        await act(async () => {
            fireEvent.click(stopBtn);
        });

        expect(stopRecorder.stop).toHaveBeenCalled();
        expect(transcribeAudioApi).toHaveBeenCalledWith('l1', expect.any(Blob));
        expect(screen.getByPlaceholderText(/Spoken content will appear/i)).toHaveValue('Transcribed Content');
    });

    it('failure: handles empty audio blob', async () => {
        mockRecorder.stop.mockResolvedValueOnce(new Blob([], { type: 'audio/webm' }));
        (useAudioRecorder as jest.Mock).mockReturnValue({ ...mockRecorder, isRecording: true });
        
        render(<ActiveCenter {...defaultProps} />);
        
        await act(async () => {
            fireEvent.click(screen.getByText(/Stop & Transcribe/i));
        });

        expect(screen.getByText(/No audio captured/i)).toBeInTheDocument();
    });

    it('success: handles candidate selection and editing', () => {
        const candidates = [{ promptText: 'AI Q', promptType: 'short_answer' as const }];
        render(<ActiveCenter {...defaultProps} candidates={candidates} />);
        
        fireEvent.click(screen.getByTestId('candidate-card'));
        
        expect(defaultProps.onSelectCandidate).toHaveBeenCalledWith(candidates[0]);
        // Should show editing textarea for the selected candidate
        expect(screen.getByPlaceholderText(/Edit this prompt/i)).toHaveValue('AI Q');
    });

    it('success: switches to manual mode and publishes', async () => {
        render(<ActiveCenter {...defaultProps} />);
        
        fireEvent.click(screen.getByText('Manual Creation'));
        
        const textarea = screen.getByPlaceholderText(/Type your question here/i);
        fireEvent.change(textarea, { target: { value: 'Manual Q' } });
        
        fireEvent.click(screen.getByText('Start Discussion'));
        // Dialog should open
        expect(screen.getByText(/Time Limit/i)).toBeInTheDocument();
        
        // Confirm timer
        fireEvent.click(screen.getByText('Use 30s Limit')); // Assuming this text matches StartDiscussionDialog
        expect(defaultProps.onPublish).toHaveBeenCalledWith(30);
    });
});

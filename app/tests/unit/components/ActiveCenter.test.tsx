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
}));

jest.mock('@/components/instructor/session/AITipsButton', () => ({
  AITipsButton: () => <div data-testid="tips-btn" />,
}));

jest.mock('@/components/instructor/session/AIPreferencesDialog', () => ({
  AIPreferencesDialog: () => <div data-testid="prefs-dialog" />,
}));

jest.mock('@/components/instructor/session/CandidateCard', () => ({
  CandidateCard: ({ onSelect }: any) => <button onClick={onSelect} data-testid="candidate-card">Select Candidate</button>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children, value, onValueChange }: any) => (
        <div data-testid="tabs" onClick={() => onValueChange?.('manual')}>{children}</div>
    ),
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-${value}`}>{children}</button>,
    TabsContent: ({ children, value }: any) => <div data-testid={`content-${value}`}>{children}</div>,
}));

jest.mock('@/components/instructor/session/StartDiscussionDialog', () => ({
  StartDiscussionDialog: ({ open, onConfirm }: any) => open ? (
    <div data-testid="start-dialog">
      <button onClick={() => onConfirm(30)}>Confirm 30s</button>
    </div>
  ) : null,
}));

jest.mock('@/components/instructor/session/MultipleChoiceEditor', () => ({
    MultipleChoiceEditor: ({ onCorrectOptionChange }: any) => (
        <div data-testid="mc-editor">
            <button onClick={() => onCorrectOptionChange('B')}>Set Correct B</button>
        </div>
    )
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

    const TestWrapper = (props: any) => {
        const [cMode, setCMode] = React.useState('ai');
        const [pInput, setPInput] = React.useState(props.promptInput || '');
        const [pType, setPType] = React.useState<any>(props.promptType || 'long_answer');

        return (
            <ActiveCenter 
                {...defaultProps} 
                {...props} 
                promptInput={pInput} 
                setPromptInput={setPInput}
                promptType={pType}
                setPromptType={setPType}
            />
        );
    };

    it('success: renders and handles generation warning', () => {
        render(<TestWrapper generationWarning="Sample Warning" />);
        expect(screen.getByText('Sample Warning')).toBeInTheDocument();
    });

    it('success: handles candidate selection and MC publishing', async () => {
        const candidates = [{ id: 'c1', promptText: 'Q1', promptType: 'multiple_choice', mcOptions: [{ label: 'A', text: '1', is_correct: true }] }];
        render(<TestWrapper candidates={candidates} />);
        
        fireEvent.click(screen.getByText('Select Candidate'));
        
        // Manual change of correct option
        fireEvent.click(screen.getByText('Set Correct B'));
        
        fireEvent.click(screen.getByText('Publish This Question →'));
        fireEvent.click(screen.getByText('Confirm 30s'));

        expect(defaultProps.onPublishAiCandidate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'c1' }),
            'B',
            false,
            30
        );
    });

    it('failure: handles transcription error', async () => {
        (transcribeAudioApi as jest.Mock).mockRejectedValue(new Error('Whisper fail'));
        (useAudioRecorder as jest.Mock).mockReturnValue({ ...mockRecorder, isRecording: true });

        render(<TestWrapper />);
        
        await act(async () => {
            fireEvent.click(screen.getByText(/Stop & Transcribe/i));
        });

        expect(screen.getByText(/Whisper fail/i)).toBeInTheDocument();
    });
});

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

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => {
  const ReactMock = require('react');
  return {
    Tabs: ({ children, onValueChange, value }: any) => {
        // We hijack children to pass onValueChange to triggers
        return <div data-testid="tabs-root">{
            ReactMock.Children.map(children, (child: any) => {
                if (!child) return null;
                if (child.type.name === 'TabsList') {
                    return ReactMock.cloneElement(child, { onValueChange });
                }
                if (child.props.value === value) return child;
                return null;
            })
        }</div>;
    },
    TabsList: ({ children, onValueChange }: any) => (
        <div>{ReactMock.Children.map(children, (child: any) => ReactMock.cloneElement(child, { onValueChange }))}</div>
    ),
    TabsTrigger: ({ children, value, onValueChange }: any) => (
        <button onClick={() => onValueChange?.(value)}>{children}</button>
    ),
    TabsContent: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock('@/components/instructor/session/StartDiscussionDialog', () => ({
  StartDiscussionDialog: ({ open, onConfirm }: any) => open ? (
    <div data-testid="start-dialog">
      <button onClick={() => onConfirm(30)}>Use 30s Limit</button>
    </div>
  ) : null,
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
        const [pInput, setPInput] = React.useState(props.promptInput || '');
        const [tText, setTText] = React.useState(props.transcriptText || '');
        const [pType, setPType] = React.useState<any>(props.promptType || 'long_answer');

        return (
            <ActiveCenter 
                {...defaultProps} 
                {...props} 
                promptInput={pInput} 
                setPromptInput={setPInput}
                transcriptText={tText}
                setTranscriptText={setTText}
                promptType={pType}
                setPromptType={setPType}
            />
        );
    };

    it('success: renders and handles manual input', () => {
        render(<TestWrapper />);
        
        const textarea = screen.getByPlaceholderText(/Spoken content will appear/i);
        fireEvent.change(textarea, { target: { value: 'Manual Question' } });
        
        expect(textarea).toHaveValue('Manual Question');
    });

    it('success: handles audio recording and transcription', async () => {
        (transcribeAudioApi as jest.Mock).mockResolvedValue('Transcribed Content');
        
        const stopRecorder = { ...mockRecorder, isRecording: true };
        (useAudioRecorder as jest.Mock).mockReturnValue(stopRecorder);
        
        render(<TestWrapper />); 
        
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
        
        render(<TestWrapper />);
        
        await act(async () => {
            fireEvent.click(screen.getByText(/Stop & Transcribe/i));
        });

        expect(screen.getByText(/No audio captured/i)).toBeInTheDocument();
    });

    it('success: handles candidate selection and editing', async () => {
        const candidates = [{ promptText: 'AI Q', promptType: 'short_answer' as const }];
        render(<TestWrapper candidates={candidates} />);
        
        fireEvent.click(screen.getByTestId('candidate-card'));
        
        expect(defaultProps.onSelectCandidate).toHaveBeenCalledWith(candidates[0]);
        // Use waitFor for useEffect state sync
        const editArea = await screen.findByPlaceholderText(/Edit this prompt/i);
        expect(editArea).toHaveValue('AI Q');
    });

    it('success: switches to manual mode and publishes', async () => {
        render(<TestWrapper />);
        
        const manualBtn = screen.getByText('Manual Creation');
        fireEvent.click(manualBtn);
        
        const textarea = screen.getByPlaceholderText(/Type your question here/i);
        fireEvent.change(textarea, { target: { value: 'Manual Q' } });
        
        fireEvent.click(screen.getByText('Start Discussion'));
        
        const confirmBtn = screen.getByText('Use 30s Limit');
        fireEvent.click(confirmBtn);
        
        expect(defaultProps.onPublish).toHaveBeenCalledWith(30);
    });
});

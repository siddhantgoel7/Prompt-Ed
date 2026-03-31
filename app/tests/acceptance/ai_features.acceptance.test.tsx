import { render, screen, fireEvent, waitFor, act } from '../utils/renderWithProviders';
import { ActiveCenter } from '@/components/instructor/session/ActiveCenter';
import { ActiveSidebar } from '@/components/instructor/session/ActiveSidebar';
import * as React from 'react';

jest.mock('next/navigation', () => ({
    useParams: () => ({ lessonId: 'lesson-1' }),
}));

jest.mock('next/link', () => {
    function MockLink({ children }: { children: React.ReactNode }) {
        return <div>{children}</div>;
    }
    return MockLink;
});

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: any) => <div>{children}</div>,
    TabsList: () => null,
    TabsTrigger: () => null,
    TabsContent: ({ children }: any) => <div>{children}</div>,
}));

// Mock the MediaRecorder
class MockMediaRecorder {
    static isTypeSupported = () => true;
    stream: MediaStream;
    mimeType = 'audio/webm';
    ondataavailable: ((e: any) => void) | null = null;
    onstop: (() => void) | null = null;

    constructor(stream: MediaStream) {
        this.stream = stream;
    }
    start() { }
    stop() {
        if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['mock audio bits'], { type: 'audio/webm' }) });
        }
        setTimeout(() => {
            if (this.onstop) this.onstop();
        }, 10);
    }
}

global.MediaRecorder = MockMediaRecorder as any;
const mockGetUserMedia = jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }],
});
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true
});

describe('AI Features (Acceptance)', () => {
    let defaultCenterProps: any;
    let defaultSidebarProps: any;

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn() as any;

        defaultCenterProps = {
            lessonId: 'lesson-1',
            promptInput: '',
            setPromptInput: jest.fn(),
            isConnected: true,
            activeDiscussionId: null,
            onPublish: jest.fn(),
            onClose: jest.fn(),
            transcriptText: '',
            setTranscriptText: jest.fn(),
            promptType: 'short_answer',
            setPromptType: jest.fn(),
            candidates: [],
            isGenerating: false,
            generationWarning: null,
            onGenerate: jest.fn(),
            onSelectCandidate: jest.fn(),
            onRegenerate: jest.fn(),
            onPublishAiCandidate: jest.fn(),
        };

        defaultSidebarProps = {
            discussions: [],
            activeDiscussionId: null,
            responses: [],
            files: [],
            isUploading: false,
            onUploadFile: jest.fn().mockResolvedValue(undefined),
            onDeleteFile: jest.fn().mockResolvedValue(undefined),
        };
    });

    // [1.16] Upload files (pdf, pptx) so i can provide sources for discussion prompts
    describe('[US 1.16] Upload files', () => {
        // 34.1
        it('success: Upload File button is visible and triggers file upload', async () => {
            render(<ActiveSidebar {...defaultSidebarProps} />);

            // Need to click "Files" tab first - skipped since we mocked Tabs

            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            expect(fileInput).toBeInTheDocument();
            expect(fileInput.accept).toBe('.pdf,.pptx');

            const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            await waitFor(() => {
                expect(defaultSidebarProps.onUploadFile).toHaveBeenCalledWith(file);
            });
        });

        // 34.2
        it('failure: Shows error when file upload fails', async () => {
            defaultSidebarProps.onUploadFile.mockRejectedValue(new Error('File too large'));
            render(<ActiveSidebar {...defaultSidebarProps} />);
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            const file = new File(['dummy content'], 'large.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(await screen.findByText('File too large')).toBeInTheDocument();
        });

        // 34.3
        it('state: Uploaded files appear in the list', async () => {
            const files = [
                { id: 'f1', fileName: 'lecture.pdf', fileSizeBytes: 1048576, status: 'ready' }
            ];
            render(<ActiveSidebar {...defaultSidebarProps} files={files} />);

            expect(await screen.findByText('lecture.pdf')).toBeInTheDocument();
            expect(await screen.findByText('Ready')).toBeInTheDocument();
        });
    });

    // [1.17] Activate and deactivate stt transcript capture
    describe('[US 1.17] Activate and deactivate STT transcript capture', () => {
        // 34.4
        it('success: Start Recording triggers audio capture', async () => {
            render(<ActiveCenter {...defaultCenterProps} />);

            const startBtn = screen.getByRole('button', { name: /^Record$/i });
            await act(async () => {
                fireEvent.click(startBtn);
            });

            expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
            expect(screen.getByRole('button', { name: /Stop.*Transcribe/i })).toBeInTheDocument();
        });

        // 34.5
        it('success: Stop Recording triggers STT transcription', async () => {
            render(<ActiveCenter {...defaultCenterProps} />);

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /^Record$/i }));
            });

            const stopBtn = screen.getByRole('button', { name: /Stop.*Transcribe/i });

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ transcript: 'Test speech' }),
            });

            await act(async () => {
                fireEvent.click(stopBtn);
            });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                expect(defaultCenterProps.setTranscriptText).toHaveBeenCalledWith('Test speech');
                expect(defaultCenterProps.onGenerate).toHaveBeenCalledWith('Test speech');
            });
        });
    });

    // [1.18] Trigger ai prompt generation
    describe('[US 1.18] Trigger AI prompt generation', () => {
        // 34.6
        it('success: Clicking Generate AI Prompt calls onGenerate', () => {
            render(<ActiveCenter {...defaultCenterProps} transcriptText="Some content" />);

            const generateBtn = screen.getByRole('button', { name: /Generate Prompts/i });
            fireEvent.click(generateBtn);

            expect(defaultCenterProps.onGenerate).toHaveBeenCalled();
        });

        // 34.7
        it('state: Displays loading indicator while generating', () => {
            render(<ActiveCenter {...defaultCenterProps} isGenerating={true} />);

            expect(screen.getByRole('button', { name: /Generating…/i })).toBeDisabled();
        });

        // 34.8
        it('failure: Shows error when content is insufficient (generationWarning)', () => {
            render(<ActiveCenter {...defaultCenterProps} generationWarning="More content needed" />);

            expect(screen.getByText('More content needed')).toBeInTheDocument();
        });
    });

    // [1.19] Review and select ai generated prompts
    describe('[US 1.19] Review and select AI generated prompts', () => {
        const candidates = [
            { promptText: 'Option A', promptType: 'short_answer' },
            { promptText: 'Option B', promptType: 'short_answer' }
        ];

        // 34.9
        it('success: Shows full list of generated prompt options', () => {
            render(<ActiveCenter {...defaultCenterProps} candidates={candidates} />);

            expect(screen.getAllByText('Option A')[0]).toBeInTheDocument();
            expect(screen.getAllByText('Option B')[0]).toBeInTheDocument();
        });

        // 34.10
        it('success: Selecting a prompt marks it as selected and shows Publish button', () => {
            render(<ActiveCenter {...defaultCenterProps} candidates={candidates} />);

            const optionA = screen.getByRole('button', { name: /Option A/i });
            fireEvent.click(optionA);

            expect(screen.getAllByText('Option A')[0]).toBeInTheDocument();
            expect(screen.getByText('Selected (Editing)')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Publish This Question/i })).toBeInTheDocument();
        });

        // 34.11
        it('success: Can publish selected prompt', () => {
            const { rerender } = render(<ActiveCenter {...defaultCenterProps} candidates={candidates} />);

            fireEvent.click(screen.getByRole('button', { name: /Option A/i }));

            // Now provide the promptInput to enable the button
            rerender(<ActiveCenter {...defaultCenterProps} candidates={candidates} promptInput="Option A" />);

            fireEvent.click(screen.getByRole('button', { name: /Publish This Question/i }));

            // Timer dialog appears — confirm with default (1 min)
            fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));

            expect(defaultCenterProps.onPublishAiCandidate).toHaveBeenCalledWith(expect.objectContaining({ promptText: 'Option A' }), null, false, 60, { allowMultipleResponses: false, responseLimit: null });
        });
    });

    // [1.23] Generate multiple choice short answer and long answer type discussion prompts
    describe('[US 1.23] Generate multiple choice, short answer, and long answer prompts', () => {
        // 34.12
        it('success: Can select prompt type', () => {
            render(<ActiveCenter {...defaultCenterProps} />);

            const select = screen.getAllByRole('combobox')[0];
            fireEvent.change(select, { target: { value: 'multiple_choice' } });

            expect(defaultCenterProps.setPromptType).toHaveBeenCalledWith('multiple_choice');
        });

        // 34.13
        it('success: Generated multiple choice prompt includes answer options', () => {
            const candidates = [
                {
                    promptText: 'What is 2+2?',
                    promptType: 'multiple_choice',
                    mcOptions: [
                        { label: 'A', text: '3' },
                        { label: 'B', text: '4' }
                    ]
                }
            ];
            render(<ActiveCenter {...defaultCenterProps} candidates={candidates} />);

            expect(screen.getAllByText('What is 2+2?')[0]).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('4')).toBeInTheDocument();
            expect(screen.getByText('multiple choice')).toBeInTheDocument();
        });
    });

    // [1.24] Regenerate ai prompts if i'm not satisfied
    describe('[US 1.24] Regenerate AI prompts', () => {
        // 34.14
        it('success: Can click Regenerate when prompts exist', () => {
            const candidates = [{ promptText: 'Option A', promptType: 'short_answer' }];
            render(<ActiveCenter {...defaultCenterProps} candidates={candidates} />);

            const regenerateBtn = screen.getByRole('button', { name: /Regenerate/i });
            fireEvent.click(regenerateBtn);

            expect(defaultCenterProps.onRegenerate).toHaveBeenCalled();
        });
    });

    // [1.20] Edit AI-generated prompts before publishing
    describe('[US 1.20] Edit AI-generated prompts', () => {
        // 34.15
        it('success: Selecting a candidate allows editing its text and calling publish with the new text', () => {
            const candidates = [{ promptText: 'Initial text', promptType: 'short_answer' }];
            // We use a local state mock variable to trap and update what gets passed down
            const { rerender } = render(<ActiveCenter {...defaultCenterProps} candidates={candidates} />);

            fireEvent.click(screen.getByRole('button', { name: /Initial text/i }));

            expect(defaultCenterProps.onSelectCandidate).toHaveBeenCalledWith(candidates[0]);

            // Now the active text area should appear
            const textArea = screen.getByPlaceholderText('Edit this prompt...');
            expect(textArea).toBeInTheDocument();

            // When editing, ActiveCenter updates its internal promptInput and calls setPromptInput
            fireEvent.change(textArea, { target: { value: 'Edited text completely' } });

            // To simulate the component's internal state accurately in the test, we need to pass down the new value
            rerender(<ActiveCenter {...defaultCenterProps} candidates={candidates} promptInput="Edited text completely" />);

            // Click publish — opens timer dialog
            const publishBtn = screen.getByRole('button', { name: /Publish This Question/i });
            fireEvent.click(publishBtn);

            // Confirm timer dialog with default (1 min)
            fireEvent.click(screen.getByRole('button', { name: /Start Discussion/i }));

            expect(defaultCenterProps.onPublishAiCandidate).toHaveBeenCalledWith(
                expect.objectContaining({ promptText: 'Edited text completely' }),
                null,
                false,
                60,
                { allowMultipleResponses: false, responseLimit: null }
            );
        });

        // 34.16
        it('failure: Publish button is disabled if edited text becomes empty', () => {
            const candidates = [{ promptText: 'Initial text', promptType: 'short_answer' }];
            const { rerender } = render(<ActiveCenter {...defaultCenterProps} candidates={candidates} promptInput="Initial text" />);

            // Select
            fireEvent.click(screen.getByRole('button', { name: /Initial text/i }));

            // The publish button exists and should be enabled initially
            const publishBtn = screen.getByRole('button', { name: /Publish This Question/i });
            expect(publishBtn).toBeEnabled();

            // Clear the edit textarea to make the publish button disabled
            const textArea = screen.getByPlaceholderText('Edit this prompt...');
            fireEvent.change(textArea, { target: { value: '' } });

            // It should now be disabled
            expect(publishBtn).toBeDisabled();
        });
    });
});

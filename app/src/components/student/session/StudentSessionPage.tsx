// Main student session page component — coordinates all student-facing session views
// (loading, waiting, active prompt, submitted, ended) and handles MC submission logic.
// src/components/student/session/StudentSessionPage.tsx
'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StudentSessionShell } from './StudentSessionShell';
import { StudentStatusAlert } from './StudentStatusAlert';
import { StudentPromptCard } from './StudentPromptCard';
import { StudentResponseForm } from './StudentResponseForm';
import { StudentWaitingCard } from './StudentWaitingCard';

import { useStudentSession } from '@/hooks/useStudentSession';

/** Renders the student session UI, routing between waiting/active/submitted/ended states. */
export function StudentSessionPage({ lessonId }: { lessonId: string }) {
  const {
    lesson,
    activeDiscussion,
    responseText,
    setResponseText,
    submitting,
    isConnected,
    view,
    endedMessage,
    errorMessage,
    canSubmit,
    submitResponse,
  } = useStudentSession(lessonId);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [prevDiscussionId, setPrevDiscussionId] = useState<string | undefined>(undefined);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitCorrect, setIsSubmitCorrect] = useState<boolean | null>(null);

  // Reset selected option and validation state when active discussion changes
  if (activeDiscussion?.id !== prevDiscussionId) {
    setPrevDiscussionId(activeDiscussion?.id);
    setSelectedOption(null);
    setSubmitAttempted(false);
    setIsSubmitCorrect(null);
  }

  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';
  const correctOptionLabel = activeDiscussion?.correct_option ?? null;
  const correctOptionText = correctOptionLabel
    ? activeDiscussion?.mc_options?.find((o) => o.label === correctOptionLabel)?.text ?? null
    : null;

  // For MC, canSubmit from the hook is always false (responseText is empty).
  // We override it here: MC just needs a connection + active view + no ongoing submit.
  const effectiveCanSubmit = isMC
    ? view === 'active' && !submitting && isConnected && Boolean(activeDiscussion?.id)
    : canSubmit;

  function handleSubmit() {
    if (isMC && !selectedOption) {
      setSubmitAttempted(true);
      return;
    }
    if (isMC && selectedOption) {
      const optionText = activeDiscussion?.mc_options?.find(o => o.label === selectedOption)?.text ?? '';

      const isCorrect = selectedOption === activeDiscussion?.correct_option;
      setIsSubmitCorrect(isCorrect);

      submitResponse(`Option ${selectedOption}: ${optionText}`, selectedOption, isCorrect);
      return;
    }
    submitResponse();
  }

  function handleSelectOption(label: string) {
    setSelectedOption(label);
    setSubmitAttempted(false); // clear error once they make a selection
  }

  return (
    <StudentSessionShell title={lesson?.title}>
      {/* Connection hint (optional but nice for production UX) */}
      {!isConnected && view !== 'loading' ? (
        <StudentStatusAlert
          title="Connecting\u2026"
          description="Trying to establish realtime updates."
        />
      ) : null}

      {errorMessage ? (
        <StudentStatusAlert
          variant="destructive"
          title="Something went wrong"
          description={errorMessage}
        />
      ) : null}

      {/* Lesson status indicator */}
      {view !== 'loading' && view !== 'error' ? (
        <div className="flex items-center gap-2">
          {view === 'ended' ? (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Ended
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          )}
        </div>
      ) : null}

      {view === 'loading' ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3 mx-auto" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : null}

      {view === 'ended' ? (
        <StudentStatusAlert
          variant="destructive"
          title="Lesson ended"
          description={endedMessage || 'Lesson has ended.'}
        />
      ) : null}

      {view === 'waiting' ? (
        <StudentWaitingCard />
      ) : null}

      {view === 'active' && activeDiscussion?.status === 'active' ? (
        <div className="space-y-4">
          <StudentPromptCard
            discussion={activeDiscussion}
            selectedOption={selectedOption}
            onSelectOption={handleSelectOption}
          />
          <StudentResponseForm
            value={
              isMC
                ? (selectedOption
                  ? `Option ${selectedOption}: ${activeDiscussion.mc_options?.find(o => o.label === selectedOption)?.text ?? ''}`
                  : '')
                : responseText
            }
            onChange={isMC ? () => { } : setResponseText}
            onSubmit={handleSubmit}
            disabled={!effectiveCanSubmit}
            submitting={submitting}
            validationMessage={submitAttempted && isMC && !selectedOption ? 'Please select an answer' : undefined}
          />
        </div>
      ) : null}

      {view === 'submitted' ? (
        <div className="space-y-4">
          <StudentStatusAlert
            title="Response submitted"
            description="You're all set. Wait for the next prompt."
          />
          {activeDiscussion?.feedback_enabled && isMC && isSubmitCorrect !== null && (
            <div className={`p-4 rounded-lg border text-sm font-medium ${isSubmitCorrect ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              <p className="flex items-center gap-2 text-lg">
                {isSubmitCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </p>
              <p className="mt-2 opacity-90 font-normal">
                {isSubmitCorrect
                  ? 'You selected the correct answer.'
                  : correctOptionLabel
                    ? `Correct Answer: ${correctOptionLabel}. ${correctOptionText ?? '(answer text unavailable)'}`
                    : 'Correct answer is unavailable.'
                }
              </p>
            </div>
          )}
        </div>
      ) : null}
    </StudentSessionShell>
  );
}

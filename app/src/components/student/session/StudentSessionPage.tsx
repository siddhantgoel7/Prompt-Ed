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

  // Reset selected option and validation state when active discussion changes
  if (activeDiscussion?.id !== prevDiscussionId) {
    setPrevDiscussionId(activeDiscussion?.id);
    setSelectedOption(null);
    setSubmitAttempted(false);
  }

  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';

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
      submitResponse(`Option ${selectedOption}: ${optionText}`);
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
            onChange={isMC ? () => {} : setResponseText}
            onSubmit={handleSubmit}
            disabled={!effectiveCanSubmit}
            submitting={submitting}
            validationMessage={submitAttempted && isMC && !selectedOption ? 'Please select an answer' : undefined}
          />
        </div>
      ) : null}

      {view === 'submitted' ? (
        <StudentStatusAlert
          title="Response submitted"
          description="You're all set. Wait for the next prompt."
        />
      ) : null}
    </StudentSessionShell>
  );
}
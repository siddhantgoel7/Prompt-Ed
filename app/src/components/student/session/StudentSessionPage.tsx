// src/components/student/session/StudentSessionPage.tsx
'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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

  // Reset selected option when active discussion changes
  useEffect(() => {
    setSelectedOption(null);
  }, [activeDiscussion?.id]);

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
            onSelectOption={setSelectedOption}
          />
          <StudentResponseForm
            value={activeDiscussion.prompt_type === 'multiple_choice'
              ? (selectedOption ? `Option ${selectedOption}: ${activeDiscussion.mc_options?.find(o => o.label === selectedOption)?.text ?? ''}` : '')
              : responseText}
            onChange={activeDiscussion.prompt_type === 'multiple_choice' ? () => {} : setResponseText}
            onSubmit={submitResponse}
            disabled={!canSubmit || (activeDiscussion.prompt_type === 'multiple_choice' && !selectedOption)}
            submitting={submitting}
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

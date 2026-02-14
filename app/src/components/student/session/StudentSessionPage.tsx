// src/components/student/session/StudentSessionPage.tsx
'use client';

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

  return (
    <StudentSessionShell title={lesson?.title}>
      {/* Connection hint (optional but nice for production UX) */}
      {!isConnected && view !== 'loading' ? (
        <StudentStatusAlert
          title="Connecting…"
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
          <StudentPromptCard prompt={activeDiscussion.prompt_text} />
          <StudentResponseForm
            value={responseText}
            onChange={setResponseText}
            onSubmit={submitResponse}
            disabled={!canSubmit}
            submitting={submitting}
          />
        </div>
      ) : null}

      {view === 'submitted' ? (
        <StudentStatusAlert
          title="Response submitted"
          description="You’re all set. Wait for the next prompt."
        />
      ) : null}
    </StudentSessionShell>
  );
}

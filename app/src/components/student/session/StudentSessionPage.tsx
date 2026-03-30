// Main student session page component — coordinates all student-facing session views
// (loading, waiting, active prompt, submitted, ended) and handles MC submission logic.
'use client';

import { useState, useEffect, useRef } from 'react';
import { StudentSessionShell } from './StudentSessionShell';
import { StudentStatusAlert } from './StudentStatusAlert';
import { StudentPromptCard } from './StudentPromptCard';
import { StudentResponseForm } from './StudentResponseForm';
import { StudentWaitingCard } from './StudentWaitingCard';
import { DiscussionTimer } from './DiscussionTimer';
import { TimerExpiredMessage } from './TimerExpiredMessage';

import { useStudentSession } from '@/hooks/useStudentSession';
import type { Discussion } from '@/types/discussion';

const FEEDBACK_DISPLAY_MS = 7_000;

/** Renders the student session UI, routing between waiting/active/submitted/ended states. */
export function StudentSessionPage({ lessonId }: Readonly<{ lessonId: string }>) {
  const {
    lesson,
    activeDiscussion,
    responseText,
    setResponseText,
    selectedOption,
    setSelectedOption,
    isSubmitCorrect,
    setIsSubmitCorrect,
    submittedAnswerText,
    setSubmittedAnswerText,
    submitting,
    isConnected,
    view,
    endedMessage,
    errorMessage,
    timerEndTime,
    timerTotalSeconds,
    timerExpired: timerExpiredRaw,
    canSubmit,
    submitResponse,
    submitAnotherResponse,
    canSubmitAnother,
    responseCount,
  } = useStudentSession(lessonId);

  // Normalize timerExpired: treat undefined (from older test mocks) as false
  const isTimerExpired = timerExpiredRaw ?? false;

  const [prevDiscussionId, setPrevDiscussionId] = useState<string | undefined>(undefined);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [feedbackPeriodActive, setFeedbackPeriodActive] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset validation and feedback states when active discussion changes
  if (activeDiscussion?.id !== prevDiscussionId) {
    setPrevDiscussionId(activeDiscussion?.id);
    setSubmitAttempted(false);
    setFeedbackPeriodActive(false);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }

  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';
  const correctOptionLabel = activeDiscussion?.correct_option ?? null;

  // Use loose null check so undefined (from older mocks / no timer) is treated same as null
  const hasTimer = timerEndTime != null && timerTotalSeconds != null;

  // For MC, canSubmit from the hook is always false (responseText is empty).
  // We override it here: MC just needs an active view + no ongoing submit + timer not expired.
  // isConnected is intentionally excluded so the button stays clickable for validation
  // (handleSubmit short-circuits before any network call when no option is selected).
  const effectiveCanSubmit = isMC
    ? view === 'active' && !submitting && Boolean(activeDiscussion?.id) && !isTimerExpired
    : canSubmit && !isTimerExpired;

  // Scenario 2 (timed MC + feedback): when timer expires while student is in 'submitted' view,
  // trigger the 7-second feedback window.
  useEffect(() => {
    if (
      isTimerExpired &&
      view === 'submitted' &&
      isMC &&
      activeDiscussion?.feedback_enabled &&
      isSubmitCorrect !== null
    ) {
      setFeedbackPeriodActive(true);
      const id = setTimeout(() => setFeedbackPeriodActive(false), FEEDBACK_DISPLAY_MS);
      feedbackTimerRef.current = id;
      return () => clearTimeout(id);
    }
  }, [isTimerExpired, view, isMC, activeDiscussion?.feedback_enabled, isSubmitCorrect]);

  // Fire confetti when a correct MC answer feedback is shown
  useEffect(() => {
    if (feedbackPeriodActive && isSubmitCorrect === true && globalThis.window !== undefined) {
      import('canvas-confetti')
        .then(({ default: confetti }) => {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
        })
        .catch(() => {
          // Non-critical — ignore failures (e.g. in test environments)
        });
    }
  }, [feedbackPeriodActive, isSubmitCorrect]);

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

      // Scenario 1 (no timer, feedback enabled): start the 7-second feedback window immediately
      if (activeDiscussion?.feedback_enabled && !hasTimer) {
        setFeedbackPeriodActive(true);
        const id = setTimeout(() => setFeedbackPeriodActive(false), FEEDBACK_DISPLAY_MS);
        feedbackTimerRef.current = id;
      }
      return;
    }
    // Short/long answer: capture the submitted text for display
    setSubmittedAnswerText(responseText);
    submitResponse();
  }

  function handleSelectOption(label: string) {
    setSelectedOption(label);
    setSubmitAttempted(false); // clear error once they make a selection
  }

  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <LoadingView />;
      case 'ended':
        return <EndedView endedMessage={endedMessage ?? undefined} />;
      case 'waiting':
        return <StudentWaitingCard />;
      case 'error':
        return null;
      case 'active':
        if (activeDiscussion?.status !== 'active') return null;
        return (
          <ActiveView
            isTimerExpired={isTimerExpired}
            activeDiscussion={activeDiscussion}
            hasTimer={hasTimer}
            timerEndTime={timerEndTime}
            timerTotalSeconds={timerTotalSeconds}
            selectedOption={selectedOption}
            handleSelectOption={handleSelectOption}
            isMC={isMC}
            responseText={responseText}
            setResponseText={setResponseText}
            handleSubmit={handleSubmit}
            effectiveCanSubmit={effectiveCanSubmit}
            submitting={submitting}
            submitAttempted={submitAttempted}
          />
        );
      case 'submitted':
        return (
          <SubmittedView
            activeDiscussion={activeDiscussion}
            isMC={isMC}
            isTimerExpired={isTimerExpired}
            feedbackPeriodActive={feedbackPeriodActive}
            isSubmitCorrect={isSubmitCorrect}
            selectedOption={selectedOption}
            correctOptionLabel={correctOptionLabel}
            hasTimer={hasTimer}
            timerEndTime={timerEndTime}
            timerTotalSeconds={timerTotalSeconds}
            submittedAnswerText={submittedAnswerText}
            canSubmitAnother={canSubmitAnother}
            onSubmitAnother={submitAnotherResponse}
            responseCount={responseCount}
          />
        );
      default:
        return null;
    }
  };

  return (
    <StudentSessionShell title={lesson?.title}>
      {!isConnected && view !== 'loading' && (
        <StudentStatusAlert title="Connecting\u2026" description="Trying to establish realtime updates." />
      )}
      {errorMessage && (
        <StudentStatusAlert variant="destructive" title="Something went wrong" description={errorMessage} />
      )}
      {view !== 'loading' && view !== 'error' && (
        <div className="flex items-center gap-2">
          {view === 'ended' ? (
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: 'var(--color-error-alpha-12)', color: 'var(--color-error-600)' }}
            >
              Ended
            </span>
          ) : (
            <span
              className="text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: 'var(--color-primary-alpha-12)', color: 'var(--color-primary-600)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {' '}Active
            </span>
          )}
        </div>
      )}
      {renderContent()}
    </StudentSessionShell>
  );
}

// ─── Sub-components and Helper Views ───────────────────────────────────────────

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={`loading-dot-${i}`}
            className="block w-2 h-2 rounded-full"
            style={{
              background: 'var(--color-primary-400)',
              animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function EndedView({ endedMessage }: Readonly<{ endedMessage: string | undefined }>) {
  return (
    <StudentStatusAlert
      variant="destructive"
      title="Lesson ended"
      description={endedMessage || 'Lesson has ended.'}
    />
  );
}

function ActiveView({
  isTimerExpired, activeDiscussion, hasTimer, timerEndTime, timerTotalSeconds,
  selectedOption, handleSelectOption, isMC, responseText, setResponseText,
  handleSubmit, effectiveCanSubmit, submitting, submitAttempted
}: Readonly<{
  isTimerExpired: boolean;
  activeDiscussion: Discussion;
  hasTimer: boolean;
  timerEndTime: number | null;
  timerTotalSeconds: number | null;
  selectedOption: string | null;
  handleSelectOption: (label: string) => void;
  isMC: boolean;
  responseText: string;
  setResponseText: (v: string) => void;
  handleSubmit: () => void;
  effectiveCanSubmit: boolean;
  submitting: boolean;
  submitAttempted: boolean;
}>) {
  if (isTimerExpired) {
    const correctOption = activeDiscussion?.correct_option;
    const correctOptionText = correctOption
      ? activeDiscussion.mc_options?.find((o: { label: string }) => o.label === correctOption)?.text ?? null
      : null;
    return (
      <TimerExpiredMessage
        feedbackEnabled={activeDiscussion?.feedback_enabled}
        correctOption={correctOption}
        correctOptionText={correctOptionText}
        isMC={isMC}
      />
    );
  }
  return (
    <div className="space-y-4">
      {hasTimer && timerEndTime && timerTotalSeconds && (
        <div className="flex justify-center">
          <DiscussionTimer timerEndTime={timerEndTime} timerTotalSeconds={timerTotalSeconds} />
        </div>
      )}
      <StudentPromptCard discussion={activeDiscussion} selectedOption={selectedOption} onSelectOption={handleSelectOption} />
      <StudentResponseForm
        value={isMC ? '' : responseText}
        onChange={isMC ? () => { } : setResponseText}
        onSubmit={handleSubmit}
        disabled={!effectiveCanSubmit}
        submitting={submitting}
        showTextarea={!isMC}
        validationMessage={submitAttempted && isMC && !selectedOption ? 'Please select an answer' : undefined}
      />
    </div>
  );
}

interface SharedSubmittedProps {
  activeDiscussion: Discussion | null;
  isMC: boolean;
  isTimerExpired: boolean;
  feedbackPeriodActive: boolean;
  isSubmitCorrect: boolean | null;
  selectedOption: string | null;
  correctOptionLabel: string | null;
  hasTimer: boolean;
  timerEndTime: number | null;
  timerTotalSeconds: number | null;
  submittedAnswerText: string | null;
  canSubmitAnother: boolean;
  onSubmitAnother: () => void;
  responseCount: number;
}

function SubmittedView(props: Readonly<SharedSubmittedProps>) {
  const { activeDiscussion } = props;
  if (!activeDiscussion) {
    return <StudentStatusAlert title="Response submitted" description="You're all set. Wait for the next prompt." />;
  }

  return (
    <div className="space-y-4">
      {props.isMC ? <SubmittedMCView {...props} /> : <SubmittedOpenView {...props} />}
    </div>
  );
}

function SubmittedMCView(props: Readonly<SharedSubmittedProps>) {
  const { activeDiscussion, feedbackPeriodActive, isSubmitCorrect, selectedOption, correctOptionLabel, hasTimer, isTimerExpired, timerEndTime, timerTotalSeconds } = props;
  if (!activeDiscussion) return null;

  if (activeDiscussion.feedback_enabled) {
    if (feedbackPeriodActive && isSubmitCorrect !== null) {
      return (
        <>
          <FeedbackResultBanner isCorrect={isSubmitCorrect} />
          <StudentPromptCard discussion={activeDiscussion} submittedOption={selectedOption} showCorrectness correctOption={correctOptionLabel} disabled />
        </>
      );
    }
    if (hasTimer && !isTimerExpired && timerEndTime && timerTotalSeconds) {
      return (
        <>
          <div className="flex justify-center"><DiscussionTimer timerEndTime={timerEndTime} timerTotalSeconds={timerTotalSeconds} /></div>
          <StudentStatusAlert title="Response submitted" description="You're all set. Results will be shown when time's up." />
          <StudentPromptCard discussion={activeDiscussion} submittedOption={selectedOption} showCorrectness={false} disabled />
        </>
      );
    }
  }

  return <SubmittedDefaultView {...props} />;
}

function FeedbackResultBanner({ isCorrect }: Readonly<{ isCorrect: boolean }>) {
  const style = isCorrect ? {
    background: 'var(--color-primary-alpha-12)', border: '1px solid var(--color-primary-alpha-25)', color: 'var(--color-primary-700)',
  } : {
    background: 'var(--color-error-alpha-10)', border: '1px solid var(--color-error-alpha-25)', color: 'var(--color-error-600)',
  };
  return (
    <div data-testid="mc-feedback-banner" data-variant={isCorrect ? 'correct' : 'incorrect'} className="text-center text-xl font-bold p-5 rounded-2xl enter" style={style}>
      {isCorrect ? 'Great job!' : 'Not quite!'}
    </div>
  );
}

function SubmittedDefaultView({ hasTimer, isTimerExpired, timerEndTime, timerTotalSeconds, activeDiscussion, selectedOption }: Readonly<SharedSubmittedProps>) {
  const showTimer = hasTimer && !isTimerExpired && timerEndTime && timerTotalSeconds;
  if (!activeDiscussion) return null;
  return (
    <>
      {showTimer && <div className="flex justify-center"><DiscussionTimer timerEndTime={timerEndTime} timerTotalSeconds={timerTotalSeconds} /></div>}
      <StudentStatusAlert
        title="Response submitted"
        description={showTimer ? "You're all set. Results will be shown when time's up." : "You're all set. Wait for the next prompt."}
      />
      <StudentPromptCard discussion={activeDiscussion} submittedOption={selectedOption} showCorrectness={false} disabled />
    </>
  );
}

function SubmittedOpenView({ hasTimer, isTimerExpired, timerEndTime, timerTotalSeconds, activeDiscussion, submittedAnswerText, canSubmitAnother, onSubmitAnother, responseCount }: Readonly<SharedSubmittedProps>) {
  if (hasTimer && !isTimerExpired && timerEndTime && timerTotalSeconds) {
    return (
      <>
        <div className="flex justify-center">
          <DiscussionTimer timerEndTime={timerEndTime} timerTotalSeconds={timerTotalSeconds} />
        </div>
        <StudentStatusAlert title="Response submitted" description="You're all set. Results will be shown when time's up." />
        {canSubmitAnother && (
          <SubmitAnotherButton onClick={onSubmitAnother} responseCount={responseCount} responseLimit={activeDiscussion?.response_limit ?? null} />
        )}
      </>
    );
  }
  if (!activeDiscussion) return null;
  return (
    <>
      <StudentPromptCard discussion={activeDiscussion} disabled />
      {submittedAnswerText && (
        <div
          data-testid="submitted-answer-display"
          className="rounded-xl p-4"
          style={{
            background: 'var(--color-primary-alpha-06)',
            border: '1px solid var(--color-primary-alpha-15)',
            borderLeft: '3px solid var(--color-primary-400)',
          }}
        >
          <p className="text-xs font-semibold mb-1.5 text-brand-600">Your response</p>
          <p className="text-sm whitespace-pre-wrap text-content-secondary">{submittedAnswerText}</p>
        </div>
      )}
      {canSubmitAnother && (
        <SubmitAnotherButton onClick={onSubmitAnother} responseCount={responseCount} responseLimit={activeDiscussion.response_limit} />
      )}
    </>
  );
}

function SubmitAnotherButton({ onClick, responseCount, responseLimit }: Readonly<{ onClick: () => void; responseCount: number; responseLimit: number | null }>) {
  const limitText = responseLimit ? ` (${responseCount}/${responseLimit})` : '';
  return (
    <button
      data-testid="submit-another-response-button"
      onClick={onClick}
      className="w-full rounded-xl text-sm py-2.5 font-semibold transition-all duration-150"
      style={{
        background: 'var(--color-primary-alpha-10)',
        border: '1px solid var(--color-primary-alpha-25)',
        color: 'var(--color-primary-600)',
      }}
    >
      Submit Another Response{limitText}
    </button>
  );
}

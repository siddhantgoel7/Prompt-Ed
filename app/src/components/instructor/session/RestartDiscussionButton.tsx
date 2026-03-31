'use client';

import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import type { Discussion } from '@/types/discussion';

interface RestartDiscussionButtonProps {
  discussion: Discussion;
  onRestart: (
    original: Discussion,
    timerSecs: number | null,
    feedbackEnabled: boolean,
    multipleResponseSettings?: { allowMultipleResponses: boolean; responseLimit: number | null }
  ) => Promise<void>;
  isLessonActive: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

/**
 * A reusable button for restarting a closed discussion.
 * Handles loading states and lesson-status gating.
 */
export function RestartDiscussionButton({
  discussion,
  onRestart,
  isLessonActive,
  className = '',
  size = 'md',
  showText = false,
}: Readonly<RestartDiscussionButtonProps>) {
  const [restarting, setRestarting] = React.useState(false);

  if (!isLessonActive || discussion.status !== 'closed') {
    return null;
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  
  const handleRestart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (restarting) return;

    setRestarting(true);
    try {
      await onRestart(
        discussion,
        discussion.time_limit_seconds ?? null,
        discussion.feedback_enabled,
        {
          allowMultipleResponses: discussion.allow_multiple_responses,
          responseLimit: discussion.response_limit,
        }
      );
    } catch (error) {
      console.error('Failed to restart discussion:', error);
    } finally {
      setRestarting(false);
    }
  };

  return (
    <button
      onClick={handleRestart}
      disabled={restarting}
      title="Restart this discussion"
      className={`inline-flex items-center gap-2 transition-all duration-200 border rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <RotateCcw className={`${iconSize} ${restarting ? 'animate-spin' : ''}`} />
      {showText && (restarting ? 'Restarting...' : 'Restart')}
    </button>
  );
}

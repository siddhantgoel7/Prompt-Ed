// Client component for the instructor's discussion detail page.
// Shows the prompt, MC option distribution (if applicable), and a live-updating response list.
'use client';

import { useRealtime } from '@/lib/realtime/useRealtime';
import { useState, useEffect } from 'react';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';


interface DiscussionClientProps {
  lessonId: string;
  discussionId: string;
  initialDiscussion: Discussion;
  initialResponses: Response[];
  initialIsActive: boolean;
}

/**
 * Displays a discussion's prompt, MC answer distribution, realtime connection status,
 * and a scrollable list of student responses that updates via Supabase Realtime.
 */
export function DiscussionPage({
  lessonId,
  discussionId,
  initialDiscussion,
  initialResponses,
  initialIsActive
}: DiscussionClientProps) {

  // 1. Initialize State with Server Data (Hydration)
  // We use state because we need to update this list when new responses arrive.
  const [responses, setResponses] = useState<Response[]>(initialResponses);
  const [isActive] = useState(initialIsActive);

  // 2. Setup Realtime
  const { channel, isConnected } = useRealtime(lessonId, 'instructor');

  useEffect(() => {
    if (!channel || !isConnected) return;

    // Listen for NEW responses
    channel.on('broadcast', { event: 'response:new' }, (payload) => {
      const newResponse = payload.payload?.response;

      if (newResponse && newResponse.discussion_id === discussionId) {
        setResponses((prev) => {
          // Deduplicate just in case
          if (prev.some(r => r.id === newResponse.id)) return prev;
          // Add to top
          return [newResponse, ...prev];
        });
      }
    });

  }, [channel, isConnected, discussionId]);

  const isMC = initialDiscussion.prompt_type === 'multiple_choice';

  const distribution: Record<string, number> = {};
  if (isMC && initialDiscussion.mc_options) {
    initialDiscussion.mc_options.forEach(opt => {
      distribution[opt.label] = 0;
    });
    responses.forEach(r => {
      if (r.selected_option && distribution[r.selected_option] !== undefined) {
        distribution[r.selected_option]++;
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* 1. BACK NAVIGATION */}
      <div className="mb-6">
        <Link
          href={`/session/${lessonId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lesson Dashboard
        </Link>
      </div>

      {/* HEADER */}
      <div className="flex flex-col gap-4 mb-8 border-b pb-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {initialDiscussion.prompt_text}
            </h1>
          </div>

          <div className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm flex items-center gap-2
            ${isActive
              ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
              : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {isActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                Active
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Closed
              </>
            )}
          </div>
        </div>
      </div>

      {isMC && initialDiscussion.mc_options && (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Multiple Choice Options</h3>
            {initialDiscussion.correct_option && (
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Correct Answer: Option {initialDiscussion.correct_option}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {initialDiscussion.mc_options.map((opt) => {
              const count = distribution[opt.label] || 0;
              const isCorrect = initialDiscussion.correct_option === opt.label;
              return (
                <div
                  key={opt.label}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 ${isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                      {opt.label}
                    </span>
                    <span className={isCorrect ? 'font-medium text-green-900' : 'text-gray-700'}>
                      {opt.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-500">{count} responses</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RESPONSES LIST */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-2">
            <span>Realtime Status:</span>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>
          <span>Total: {responses.length}</span>
        </div>

        {responses.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
            <p>No responses recorded yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {responses.map((resp) => (
              <div
                key={resp.id}
                className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <p className="text-gray-800 text-lg leading-relaxed">{resp.response_text}</p>
                <div className="mt-3 flex justify-end items-center gap-2 text-xs text-gray-400 font-medium">
                  <span suppressHydrationWarning>{new Date(resp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
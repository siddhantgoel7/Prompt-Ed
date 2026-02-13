'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import type { Discussion } from '@/types/discussion';
import type { Lesson } from '@/types/lesson';

export default function StudentSessionPage({
  params
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = use(params);
  const router = useRouter();
  const { channel } = useRealtime(lessonId, 'student');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lessonEnded, setLessonEnded] = useState(false);
  const [lessonEndedMessage, setLessonEndedMessage] = useState<string | null>(null);


  // Verify lesson is active and fetch current active discussion
  useEffect(() => {
    const checkLesson = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error || !data || data.status !== 'active') {
        router.push('/');
        return;
      }

      setLesson(data);

      // Fetch any existing active discussion for this lesson
      const { data: activeDiscussionData, error: discussionError } = await supabase
        .from('discussions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('status', 'active')
        .maybeSingle();

      if (discussionError) {
        console.error('Error fetching active discussion:', discussionError);
      } else if (activeDiscussionData) {
        setActiveDiscussion(activeDiscussionData);
      }
    };

    checkLesson();
  }, [lessonId, router]);

  // Listen for discussion events
  useEffect(() => {
    if (!channel) {
      console.log('Student: No channel available yet');
      return;
    }

    console.log('Student: Setting up broadcast listeners');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lessonEndedSubscription = (channel as any).on(
      'broadcast',
      { event: 'lesson:ended' },
      (payload: { payload?: { message?: string }; message?: string }) => {
        const message = payload.payload?.message || payload.message || 'Lesson has ended';
        setLessonEnded(true);
        setLessonEndedMessage(message);
        setActiveDiscussion(null);
        setSubmitted(false);
      }
    );


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const discussionSubscription = (channel as any).on(
      'broadcast',
      { event: 'discussion:published' },
      (payload: { payload?: { discussion: Discussion }; discussion?: Discussion }) => {
        console.log('Student received discussion:published event:', payload);
        // The broadcast wraps the payload, so we need payload.payload.discussion
        const discussion = payload.payload?.discussion || payload.discussion;
        console.log('Extracted discussion:', discussion);
        if (discussion) {
          setActiveDiscussion(discussion);
          setResponseText('');
          setSubmitted(false);
          console.log('Active discussion set');
        }
      }
      
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const closureSubscription = (channel as any).on(
      'broadcast',
      { event: 'discussion:closed' },
      (payload: { payload?: { discussionId: string }; discussionId?: string }) => {
        console.log('Student received discussion:closed event:', payload);
        const discussionId = payload.payload?.discussionId || payload.discussionId;
        setActiveDiscussion(prev => {
          if (prev?.id === discussionId) {
            return { ...prev, status: 'closed' } as Discussion;
          }
          return prev;
        });
      }
    );

    console.log('Student: Broadcast listeners registered');

    return () => {
      console.log('Student: Cleaning up broadcast listeners');
      discussionSubscription.unsubscribe();
      closureSubscription.unsubscribe();
      lessonEndedSubscription.unsubscribe();
    };
  }, [channel]);

  // Submit response
  const handleSubmitResponse = async () => {
    if (lessonEnded) return;

    if (!activeDiscussion || !responseText.trim()) return;

    console.log('Student submitting response:', responseText);
    setSubmitting(true);

    const supabase = createClient();
    const { data: newResponse, error } = await supabase
      .from('responses')
      .insert([{
        discussion_id: activeDiscussion.id,
        response_text: responseText
      }])
      .select()
      .single();

    if (error) {
      console.error('Error submitting response:', error);
      setSubmitting(false);
      return;
    }

    console.log('Response saved to database:', newResponse);

    if (channel) {
      console.log('Broadcasting response to instructor...');
      const result = await channel.send({
        type: 'broadcast',
        event: 'response:new',
        payload: { response: newResponse }
      });
      console.log('Broadcast result:', result);
    } else {
      console.error('No channel available for broadcasting response!');
    }

    setSubmitted(true);
    setSubmitting(false);
    setResponseText('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">{lesson?.title}</h1>
        {lessonEnded ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-6">
            <p className="text-red-700 font-semibold">{lessonEndedMessage || 'Lesson has ended'}</p>
          </div>
         
        ) : activeDiscussion && activeDiscussion.status === 'active' ? (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-2">Discussion Prompt:</h2>
              <p className="text-gray-800 text-lg">{activeDiscussion.prompt_text}</p>
            </div>

            {!submitted ? (
              <div>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  rows={6}
                />
                <button
                  onClick={handleSubmitResponse}
                  disabled={lessonEnded || submitting || !responseText.trim()}
                  className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-semibold">✓ Response submitted!</p>
              </div>
            )}
          </div>
        ) : activeDiscussion && activeDiscussion.status === 'closed' ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">Waiting for instructor to publish a discussion..</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">Waiting for instructor to publish a discussion...</p>
          </div>
        )}
      </div>
    </div>
  );
}

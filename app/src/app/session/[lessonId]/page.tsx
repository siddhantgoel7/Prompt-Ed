// app/session/[lessonId]/page.tsx
'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import type { Lesson } from '@/types/lesson';
import type { Discussion, DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';

/**
 * Discussion History Component
 * Displays a list of all discussions for the current lesson with metadata.
 * Shows discussion status, response counts, and timestamps.
 * Highlights the currently active discussion.
 */
interface DiscussionHistoryProps {
  discussions: DiscussionWithResponseCount[];
  activeDiscussionId: string | null;
}

function DiscussionHistory({ discussions, activeDiscussionId }: DiscussionHistoryProps) {
  // Empty state when no discussions exist
  if (discussions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400">No discussions yet</p>
        <p className="text-xs text-gray-400 mt-1">Start a discussion to see it here</p>
      </div>
    );
  }

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // Show relative time if less than 24 hours
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    // Show date for older discussions
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Truncate long text with ellipsis
  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-2">
      {discussions.map((discussion, index) => {
        const isActive = discussion.id === activeDiscussionId;
        const displayNumber = index + 1;

        return (
          <div
            key={discussion.id}
            className={`
              bg-white border rounded-lg p-3 transition-all
              ${isActive
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-200 hover:bg-gray-50 hover:shadow-md'
              }
              cursor-pointer
            `}
          >
            {/* Discussion Number Badge */}
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">
                #{displayNumber}
              </span>

              {/* Status Badge */}
              {discussion.status === 'active' ? (
                <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-semibold">
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-600 font-semibold">
                  Closed
                </span>
              )}
            </div>

            {/* Prompt Text */}
            <p className="text-sm text-gray-700 mb-2 leading-relaxed">
              {truncateText(discussion.prompt_text)}
            </p>

            {/* Metadata: Response Count + Timestamp */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="font-medium">{discussion.response_count}</span>
                <span>{discussion.response_count === 1 ? 'response' : 'responses'}</span>
              </div>

              {discussion.published_at && (
                <>
                  <span>•</span>
                  <span>{formatTime(discussion.published_at)}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SessionPage({
  params
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = use(params);
  const router = useRouter();
  const { channel, isConnected } = useRealtime(lessonId, 'instructor');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/purity
  const barHeights = Array.from({ length: 40 }, () => Math.random() * 100);

  /**
   * State Management for Discussion System
   *
   * Four interconnected state variables manage the discussion lifecycle:
   *
   * 1. discussions: DiscussionWithResponseCount[]
   *    - Array of ALL discussions that occurred during this lesson
   *    - Ordered by display_order (sequence: 0, 1, 2, ...)
   *    - Includes response_count from database aggregation
   *    - Updated when: publishing new discussion, closing discussion, fetching
   *
   * 2. activeDiscussion: Discussion | null
   *    - The ONE currently active discussion (status='active')
   *    - Only one can be active at a time (enforced in handlePublishDiscussion)
   *    - Set to null when discussion closes
   *    - Students can only respond to the active discussion
   *
   * 3. responses: Response[]
   *    - Array of responses for the CURRENT active discussion only
   *    - Ordered newest-first (prepend pattern: [new, ...prev])
   *    - Real-time updates via broadcast listener
   *    - Cleared when new discussion published
   *
   * 4. promptInput: string
   *    - User input for manually creating discussion prompt
   *    - Cleared after publishing
   *    - Required to enable "Start Discussion" button
   *
   * State Synchronization Flow:
   * - Publish: activeDiscussion set → discussions updated → responses cleared
   * - Close: activeDiscussion cleared → discussions refetched
   * - Response received: responses prepended → discussions count incremented
   *
   * Race Condition Considerations:
   * - If instructor closes while student submits → response may insert but not display
   * - If student joins mid-discussion → won't see active discussion until new one published
   * - Multiple simultaneous responses → order determined by broadcast arrival, not DB timestamp
   */
  const [discussions, setDiscussions] = useState<DiscussionWithResponseCount[]>([]);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [promptInput, setPromptInput] = useState('');

  // UI state for tabbed interface
  const [activeTab, setActiveTab] = useState<'discussions' | 'files' | 'analytics'>('discussions');

  // Generate 6-digit PIN code
  const generatePinCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  /**
   * Fetches all discussions for current lesson with aggregated response counts.
   *
   * Uses Supabase query builder to:
   * 1. Select all discussions for this lesson
   * 2. Join with responses table to get count
   * 3. Order by display_order (chronological sequence)
   *
   * The response_count field is computed via SQL aggregation:
   * SELECT *, responses:responses(count)
   * This returns [{ count: N }] which we extract as d.responses[0].count
   *
   * Note: Real-time response updates use the responses array, not response_count,
   * so the count may lag slightly behind actual responses until refetch.
   *
   * @returns {Promise<void>} Updates discussions state with fetched data
   */
  const fetchDiscussions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('discussions')
      .select('*, responses:responses(count)')
      .eq('lesson_id', lessonId)
      .order('display_order', { ascending: true });

    if (data) {
      const discussionsWithCounts = data.map((d) => ({
        ...d,
        response_count: d.responses?.[0]?.count || 0
      }));
      setDiscussions(discussionsWithCounts);

      // Set active discussion if one exists
      const active = discussionsWithCounts.find((d) => d.status === 'active');
      setActiveDiscussion(active || null);
    }
  }, [lessonId]);

  useEffect(() => {
    const fetchLesson = async () => {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/');
        return;
      }

      // Fetch lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*, courses!inner(instructor_id)')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData) {
        console.error('Error fetching lesson:', lessonError);
        router.push('/');
        return;
      }

      // Check if user owns this lesson's course
      if (lessonData.courses.instructor_id !== user.id) {
        router.push('/');
        return;
      }

      // Start lesson if not started (generate PIN, set status to active)
      if (lessonData.status === 'draft') {
        const pinCode = generatePinCode();
        const { data: updatedLesson } = await supabase
          .from('lessons')
          .update({
            status: 'active',
            pin_code: pinCode,
            started_at: new Date().toISOString()
          })
          .eq('id', lessonId)
          .select()
          .single();

        setLesson(updatedLesson);
      } else {
        setLesson(lessonData);
      }

      // Fetch existing discussions
      await fetchDiscussions();

      setLoading(false);
    };

    fetchLesson();
  }, [lessonId, router, fetchDiscussions]);

  // Listen for real-time response submissions
  useEffect(() => {
    if (!channel) {
      console.log('Instructor: No channel for response listening');
      return;
    }

    console.log('Instructor: Setting up response listener');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseSubscription = (channel as any).on(
      'broadcast',
      { event: 'response:new' },
      (payload: { payload?: { response: Response }; response?: Response }) => {
        console.log('Instructor received response:new event:', payload);
        /**
         * Handle nested payload structure from Supabase Realtime.
         * Supabase wraps broadcast payloads in an additional 'payload' property,
         * so we need to check both paths:
         * - payload.payload.response (Supabase wrapper)
         * - payload.response (direct broadcast)
         */
        const response = payload.payload?.response || payload.response;
        console.log('Extracted response:', response);
        if (response) {
          setResponses(prev => [response, ...prev]);
          console.log('Response added to list');

          // Update response count for the active discussion in real-time
          // Use response.discussion_id from the payload instead of stale activeDiscussion
          setDiscussions(prev => prev.map(d =>
            d.id === response.discussion_id
              ? { ...d, response_count: d.response_count + 1 }
              : d
          ));
        }
      }
    );

    console.log('Instructor: Response listener registered');

    return () => {
      console.log('Instructor: Cleaning up response listener');
      responseSubscription.unsubscribe();
    };
  }, [channel]);

  // Fetch responses for a discussion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchResponses = async (discussionId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: false });

    if (data) setResponses(data);
  };

  /**
   * Publishes a new discussion prompt to all connected students in real-time.
   *
   * Flow:
   * 1. Closes any existing active discussion (only one can be active at a time)
   * 2. Inserts new discussion to database with status='active'
   * 3. Broadcasts 'discussion:published' event via Supabase Realtime channel
   * 4. Updates local state: adds to discussions array, clears responses/input
   *
   * @throws {Error} If database insert fails (logged to console, no user feedback)
   * @see handleCloseDiscussion - Closes previous discussion
   * @see channel.send - Broadcasts to students via Realtime
   *
   * Related User Stories: US 1.25, US 1.27, US 1.28
   */
  const handlePublishDiscussion = async () => {
    if (!promptInput.trim()) return;

    console.log('Publishing discussion with prompt:', promptInput);
    const supabase = createClient();

    if (activeDiscussion) {
      console.log('Closing existing discussion first');
      await handleCloseDiscussion(activeDiscussion.id);
    }

    const displayOrder = discussions.length;
    console.log('Inserting discussion to database...');
    const { data: newDiscussion, error } = await supabase
      .from('discussions')
      .insert([{
        lesson_id: lessonId,
        prompt_text: promptInput,
        prompt_type: 'short_answer',
        status: 'active',
        published_at: new Date().toISOString(),
        display_order: displayOrder
      }])
      .select()
      .single();

    if (error) {
      console.error('Error publishing discussion:', error);
      return;
    }

    console.log('Discussion created successfully:', newDiscussion);

    if (channel) {
      console.log('Broadcasting to students via channel...');
      const result = await channel.send({
        type: 'broadcast',
        event: 'discussion:published',
        payload: { discussion: newDiscussion }
      });
      console.log('Broadcast result:', result);
    } else {
      console.error('Channel is not available!');
    }

    setActiveDiscussion(newDiscussion);
    setDiscussions(prev => [...prev, { ...newDiscussion, response_count: 0 }]);
    setResponses([]);
    setPromptInput('');
    console.log('Discussion state updated');
  };

  /**
   * Closes an active discussion, preventing further student responses.
   *
   * Flow:
   * 1. Updates discussion status to 'closed' in database
   * 2. Records closed_at timestamp
   * 3. Broadcasts 'discussion:closed' event to all students
   * 4. Clears local activeDiscussion state
   * 5. Refetches all discussions to update UI
   *
   * Note: Students who have the response form open when this is called
   * will see the form disabled and a "closed" message.
   *
   * @param {string} discussionId - UUID of discussion to close
   * @throws {Error} If database update fails (logged to console)
   *
   * Related User Stories: US 1.28
   */
  const handleCloseDiscussion = async (discussionId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('discussions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', discussionId);

    if (error) {
      console.error('Error closing discussion:', error);
      return;
    }

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'discussion:closed',
        payload: { discussionId }
      });
    }

    setActiveDiscussion(null);
    await fetchDiscussions();
  };

  const handleEnd = () => {
    if (lesson) {
      router.push(`/lessons_page/${lesson.course_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Lesson not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{lesson.title}</h1>

        <div className="flex items-center gap-4">
          {/* QR Code and Join Code */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs">
              QR
            </div>
            <span className="font-semibold">Join Code: {lesson?.pin_code || '124567'}</span>
          </div>

          {/* Action Buttons */}
          <button className="px-6 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
            Display
          </button>
          <button
            onClick={handleEnd}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700"
          >
            End
          </button>
          <button className="px-6 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
            Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Tabbed Interface */}
        <div className="w-64 border-r border-gray-300 p-4">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-300 mb-4">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`flex-1 pb-2 text-xs font-semibold transition-colors ${
                activeTab === 'discussions'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Discussions
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 pb-2 text-xs font-semibold transition-colors ${
                activeTab === 'files'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 pb-2 text-xs font-semibold transition-colors ${
                activeTab === 'analytics'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Analytics
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'discussions' && (
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <DiscussionHistory
                discussions={discussions}
                activeDiscussionId={activeDiscussion?.id || null}
              />
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="font-semibold">Files Uploaded</span>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-700 hover:bg-gray-100 p-2 rounded cursor-pointer">
                  lec.pdf
                </div>
                <div className="text-sm text-gray-700 hover:bg-gray-100 p-2 rounded cursor-pointer">
                  drugs.pdf
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="font-bold mb-4">Analytics and Responses</h3>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Answers</h4>
                  <button className="text-gray-500 hover:text-gray-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>

                {/* Student Responses */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-sm">
                    Student Responses ({responses.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {responses.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        Waiting for student responses...
                      </p>
                    ) : (
                      responses.map((response) => (
                        <div
                          key={response.id}
                          className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                        >
                          <p className="text-gray-700">{response.response_text}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(response.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Donut Chart Placeholder */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                    <span className="text-sm font-semibold">Ques</span>
                  </div>
                </div>

                <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span>option</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                    <span>option</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                    <span>option</span>
                  </div>
                </div>

                <button className="w-full mt-4 px-4 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800">
                  View In-detail
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Prompt Display */}
          <div className="p-6">
            <div className="flex justify-end mb-2">
              <span className="text-xs text-gray-400">text from speech</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-6 relative">
              <p className="text-gray-700 mb-4">
                Lorem ipsum dolor sit amet, consectetur adipisim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo conseq
              </p>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-gray-400 text-white rounded-full text-sm hover:bg-gray-500">
                Edit
              </button>
            </div>
          </div>

          {/* Prompts Generated Label */}
          <div className="px-6">
            <p className="text-xs text-gray-400 text-center mb-4">prompts generated</p>
          </div>

          {/* Generated Prompts */}
          <div className="px-6 grid grid-cols-2 gap-4 mb-6">
            {/* Prompt Card 1 - In Use */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <div className="mb-4">
                <p className="font-semibold mb-2">Who is making the standards?</p>
                <p className="text-sm text-gray-600">The www</p>
                <p className="text-sm text-gray-600">Microsoft</p>
                <p className="text-sm text-gray-600">Mozilla</p>
              </div>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-black text-white rounded-full text-sm hover:bg-gray-800">
                In-Use
              </button>
            </div>

            {/* Prompt Card 2 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <p className="text-sm text-gray-700">
                Lorem ipsum dolor sit amet, consectetur adipisim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo conseq
              </p>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Use
              </button>
            </div>

            {/* Prompt Card 3 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <p className="text-sm text-gray-700">
                Lorem ipsum dolor sit amet, consectetur adipisim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo conseq
              </p>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Use
              </button>
            </div>
          </div>

          {/* Voice Input Section */}
          <div className="px-6 pb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Space to type multiple prompts"
                className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />

              <div className="flex items-center gap-4">
                {/* Microphone Button */}
                <button className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Waveform Visualization */}
                <div className="flex-1 flex items-center gap-0.5 h-12">
                  {barHeights.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gray-300 rounded-full"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                {/* Play Button */}
                <button className="w-12 h-12 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Question & Timer */}
        <div className="w-80 border-l border-gray-300 p-6">
          <div className="mb-6">
            <h3 className="font-bold mb-4">Question Selected:</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
              <p className="font-semibold mb-3">Who is making the standards?</p>

              <div className="space-y-2">
                <div className="bg-blue-600 text-white px-3 py-2 rounded text-sm">
                  The World Wide Web Consortium
                </div>
                <div className="bg-white border border-gray-300 px-3 py-2 rounded text-sm">
                  Microsoft
                </div>
                <div className="bg-white border border-gray-300 px-3 py-2 rounded text-sm">
                  Mozilla
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Single response
              </button>
              <button className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Multiple response
              </button>
            </div>

            <button
              onClick={handlePublishDiscussion}
              disabled={!promptInput.trim() || !isConnected}
              className="w-full mb-2 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              Start Discussion
            </button>
            <button
              onClick={() => activeDiscussion && handleCloseDiscussion(activeDiscussion.id)}
              disabled={!activeDiscussion}
              className="w-full mb-2 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              Close Discussion
            </button>
            <button className="w-full px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
              Edit
            </button>
          </div>

          {/* Timer */}
          <div>
            <h3 className="font-bold mb-4">Timer</h3>
            <div className="bg-purple-100 rounded-lg p-6 mb-4">
              <div className="text-center mb-4">
                <span className="text-6xl font-bold">07</span>
                <span className="text-4xl font-bold mx-2">:</span>
                <span className="text-6xl font-bold">00</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
                Reset
              </button>
              <button className="flex-1 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
                Start
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

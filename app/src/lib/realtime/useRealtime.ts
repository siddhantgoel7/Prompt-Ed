import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Custom hook for managing Supabase Realtime channel subscription.
 *
 * Creates a lesson-scoped channel that both instructor and students join
 * to enable real-time broadcasting of discussions and responses.
 *
 * Channel naming: `lesson:${lessonId}` (e.g., "lesson:abc-123")
 * Broadcast mode: Acknowledgment enabled (ack: true)
 *
 * Connection lifecycle:
 * 1. Channel created when lessonId changes
 * 2. Subscribe called, waits for 'SUBSCRIBED' status
 * 3. isConnected set to true when subscribed
 * 4. On unmount or lessonId change, unsubscribes and cleans up
 *
 * @param {string} lessonId - Unique identifier for the lesson
 * @param {'instructor' | 'student'} role - User role (for logging only)
 * @returns {{ channel: RealtimeChannel | null, isConnected: boolean, reconnect: () => void }}
 *
 * Usage:
 * const { channel, isConnected } = useRealtime(lessonId, 'instructor');
 * channel?.on('broadcast', { event: 'my-event' }, callback);
 *
 * Related User Stories: US 1.27, US 1.28, US 2.09
 */
export function useRealtime(lessonId: string, role: 'instructor' | 'student') {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabaseRef = useRef(createClient());
  // Force re-render when channel changes
  const [, forceUpdate] = useState(0);
  // Bump to force the effect to re-run (used by reconnect)
  const [connectAttempt, setConnectAttempt] = useState(0);

  useEffect(() => {
    if (!lessonId) return;

    const supabase = supabaseRef.current;

    // Create a channel for this lesson
    const channel = supabase.channel(`lesson:${lessonId}`, {
      config: {
        broadcast: { ack: true },
      },
    });

    // Subscribe to the channel
    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`${role} subscribed to lesson ${lessonId}`);
          setIsConnected(true);
          channelRef.current = channel;
          forceUpdate(prev => prev + 1); // Trigger re-render
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          channelRef.current = null;
          forceUpdate(prev => prev + 1); // Trigger re-render
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [lessonId, role, connectAttempt]);

  // Detect browser online/offline to immediately update connection status
  useEffect(() => {
    const handleOffline = () => setIsConnected(false);
    const handleOnline = () => {
      // Browser is back online — reconnect the channel
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setConnectAttempt(prev => prev + 1);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const reconnect = useCallback(() => {
    // Tear down existing channel and re-subscribe by bumping the attempt counter
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    }
    setConnectAttempt(prev => prev + 1);
  }, []);

  // Safe to return ref.current here because forceUpdate ensures re-renders
  /* eslint-disable react-hooks/refs */
  return {
    channel: channelRef.current,
    isConnected,
    reconnect,
  };
  /* eslint-enable react-hooks/refs */
}

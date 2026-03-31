import { useEffect, useRef, useState } from 'react';
import { updateParticipantSnapshotApi } from '@/lib/api/discussionsApi';

/**
 * Tracks the peak (highest-ever) student count for a discussion and persists it
 * to `participant_snapshot` in the DB. The peak never decreases — when students
 * leave, the count stays at the high-water mark.
 *
 * Used by both the lesson session page and the discussion detail page to ensure
 * consistent response-rate denominators across views.
 *
 * @param discussionId - The active discussion ID (null if no discussion is active)
 * @param initialSnapshot - The `participant_snapshot` value from the DB (seeds the peak on mount)
 * @param liveStudentCount - The current live student count from realtime presence
 * @returns peakStudentCount - The highest student count observed
 */
export function useParticipantPeak(
  discussionId: string | null,
  initialSnapshot: number,
  liveStudentCount: number,
) {
  const peakRef = useRef<number>(0);
  const [peak, setPeak] = useState<number>(0);
  const discussionIdRef = useRef<string | null>(null);

  // Reset peak when discussion changes — must come before seed/track effects so that
  // when both discussionId and initialSnapshot change in the same render, this fires
  // first (setting peak to 0), then the seed effect fires and sets it to initialSnapshot.
  useEffect(() => {
    discussionIdRef.current = discussionId;
    peakRef.current = 0;
    setPeak(0); // eslint-disable-line react-hooks/set-state-in-effect -- syncing with discussion identity change
  }, [discussionId]);

  // Seed peak from DB snapshot when discussion loads or snapshot updates
  useEffect(() => {
    if (initialSnapshot > peakRef.current) {
      peakRef.current = initialSnapshot;
      setPeak(initialSnapshot); // eslint-disable-line react-hooks/set-state-in-effect -- syncing from external DB value
    }
  }, [initialSnapshot]);

  // Track live student count — update peak and persist to DB when it increases
  useEffect(() => {
    if (liveStudentCount > peakRef.current) {
      peakRef.current = liveStudentCount;
      setPeak(liveStudentCount); // eslint-disable-line react-hooks/set-state-in-effect -- syncing from external presence count
      if (discussionIdRef.current) {
        updateParticipantSnapshotApi(discussionIdRef.current, liveStudentCount);
      }
    }
  }, [liveStudentCount]);

  return peak;
}

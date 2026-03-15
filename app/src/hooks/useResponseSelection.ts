'use client';

import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

export interface UseResponseSelectionOptions {
  /** Called to remove/flag a response. The hook handles loading state and
   *  deselection; the caller provides the actual API call. */
  onRemove: (responseId: string) => Promise<void>;
}

export interface UseResponseSelectionReturn {
  selectedIds: string[];
  flaggingId: string | null;
  showHighlightedOnly: boolean;
  toggleSelected: (id: string) => void;
  handleFlagInappropriate: (responseId: string) => Promise<void>;
  setShowHighlightedOnly: Dispatch<SetStateAction<boolean>>;
  /** Resets all selection state — useful when active discussion changes. */
  resetSelection: () => void;
  /** Filters a response array based on current showHighlightedOnly state. */
  filterResponses: <T extends { id: string }>(responses: T[]) => T[];
}

export function useResponseSelection({
  onRemove,
}: UseResponseSelectionOptions): UseResponseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [showHighlightedOnly, setShowHighlightedOnly] = useState(false);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleFlagInappropriate = useCallback(async (responseId: string) => {
    setFlaggingId(responseId);
    try {
      await onRemove(responseId);
      setSelectedIds(prev => prev.filter(x => x !== responseId));
    } catch (err) {
      console.error('Failed to flag response:', err);
    } finally {
      setFlaggingId(null);
    }
  }, [onRemove]);

  const resetSelection = useCallback(() => {
    setSelectedIds([]);
    setFlaggingId(null);
    setShowHighlightedOnly(false);
  }, []);

  // Auto-reset highlight filter when all highlighted responses are removed (e.g. flagged)
  useEffect(() => {
    if (selectedIds.length === 0 && showHighlightedOnly) {
      setShowHighlightedOnly(false);
    }
  }, [selectedIds.length, showHighlightedOnly]);

  const filterResponses = useCallback(<T extends { id: string }>(responses: T[]): T[] => {
    return showHighlightedOnly
      ? responses.filter(r => selectedIds.includes(r.id))
      : responses;
  }, [showHighlightedOnly, selectedIds]);

  return {
    selectedIds,
    flaggingId,
    showHighlightedOnly,
    toggleSelected,
    handleFlagInappropriate,
    setShowHighlightedOnly,
    resetSelection,
    filterResponses,
  };
}

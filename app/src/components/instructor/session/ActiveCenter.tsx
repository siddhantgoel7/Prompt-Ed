'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as React from 'react';

export function ActiveCenter({
  promptInput,
  setPromptInput,
  isConnected,
  activeDiscussionId,
  onPublish,
  onClose,
}: {
  promptInput: string;
  setPromptInput: (v: string) => void;
  isConnected: boolean;
  activeDiscussionId: string | null;
  onPublish: () => void;
  onClose: (discussionId: string) => void;
}) {
  return (
    <div className="flex-1 p-6">
      <Input
        type="text"
        value={promptInput}
        onChange={(e) => setPromptInput(e.target.value)}
        placeholder="Space to type multiple prompts"
        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
      />

      {/* Keep label "Start Discussion" for tests */}
      <Button
        onClick={onPublish}
        disabled={!promptInput.trim() || !isConnected}
        className="px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
      >
        Start Discussion
      </Button>

      {/* Keep label "Close Discussion" for tests */}
      <Button
        onClick={() => activeDiscussionId && onClose(activeDiscussionId)}
        disabled={!activeDiscussionId}
        className="ml-2 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
      >
        Close Discussion
      </Button>
    </div>
  );
}

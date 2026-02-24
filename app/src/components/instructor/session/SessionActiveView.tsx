'use client';

import * as React from 'react';
import { JoinCodeOverlay } from '@/components/instructor/session/JoinCodeOverlay';
import { SessionHeaderActive } from '@/components/instructor/session/SessionHeaderActive';
import { ActiveSidebar } from '@/components/instructor/session/ActiveSidebar';
import { ActiveCenter } from '@/components/instructor/session/ActiveCenter';
import { ActiveRightPanel } from '@/components/instructor/session/ActiveRightPanel';
import type { SessionVM } from '@/hooks/useSessionPage';

export function SessionActiveView({ vm }: { vm: SessionVM }) {
  const lesson = vm.lesson;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SessionHeaderActive
        title={lesson.title}
        pinCode={lesson.pin_code}
        endingLesson={vm.endingLesson}
        onDisplay={vm.handleDisplay}
        onEnd={vm.handleEnd}
      />

      {vm.endError ? <p className="text-sm text-red-600 px-6 py-2">{vm.endError}</p> : null}

      <JoinCodeOverlay
        open={vm.displayState}
        code={lesson.pin_code}
        onClose={() => {
          // Keep behavior identical: Display toggles the same boolean
          if (vm.displayState) vm.handleDisplay();
        }}
      />

      <div className="flex-1 flex flex-col md:flex-row">
        <ActiveSidebar
          discussions={vm.discussions}
          activeDiscussionId={vm.activeDiscussion?.id ?? null}
          responses={vm.responses}
          files={vm.files}
          isUploading={vm.isUploading}
          onUploadFile={vm.uploadFile}
          onDeleteFile={vm.deleteFile}
        />

        <ActiveCenter
          promptInput={vm.promptInput}
          setPromptInput={vm.setPromptInput}
          isConnected={vm.isConnected}
          activeDiscussionId={vm.activeDiscussion?.id ?? null}
          onPublish={vm.handlePublishDiscussion}
          onClose={vm.handleCloseDiscussion}
        />

        <ActiveRightPanel responses={vm.responses} />
      </div>
    </div>
  );
}

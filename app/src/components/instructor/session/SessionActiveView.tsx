'use client';
// MERGED: wires all AI props from VM to components

import * as React from 'react';
import { JoinCodeOverlay } from '@/components/instructor/session/JoinCodeOverlay';
import { SessionHeaderActive } from '@/components/instructor/session/SessionHeaderActive';
import { ActiveSidebar } from '@/components/instructor/session/ActiveSidebar';
import { ActiveCenter } from '@/components/instructor/session/ActiveCenter';
import { ActiveRightPanel } from '@/components/instructor/session/ActiveRightPanel';
import { SplitView } from '@/components/instructor/session/SplitView';
import type { SessionVM } from '@/hooks/useSessionPage';

export function SessionActiveView({ vm }: { vm: SessionVM }) {
  const lesson = vm.lesson;
  const [splitView, setSplitView] = React.useState(false);

  if (splitView) {
    return (
      <SplitView
        discussions={vm.discussions}
        lessonId={lesson.id}
        onBack={() => setSplitView(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SessionHeaderActive
        title={lesson.title}
        pinCode={lesson.pin_code}
        endingLesson={vm.endingLesson}
        onDisplay={vm.handleDisplay}
        onEnd={vm.handleEnd}
        onSplitView={() => setSplitView(true)}
      />

      {vm.endError ? <p className="text-sm text-red-600 px-6 py-2">{vm.endError}</p> : null}

      <JoinCodeOverlay
        open={vm.displayState}
        code={lesson.pin_code}
        onClose={() => { if (vm.displayState) vm.handleDisplay(); }}
      />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar: discussions + file upload (US 1.16) */}
        <ActiveSidebar
          discussions={vm.discussions}
          activeDiscussionId={vm.activeDiscussion?.id ?? null}
          responses={vm.responses}
          files={vm.files}
          isUploading={vm.isUploading}
          onUploadFile={vm.uploadFile}
          onDeleteFile={vm.deleteFile}
        />

        {/* Center: AI generation + STT (US 1.17, 1.18, 1.19) */}
        <ActiveCenter
          lessonId={lesson.id}
          promptInput={vm.promptInput}
          setPromptInput={vm.setPromptInput}
          isConnected={vm.isConnected}
          activeDiscussionId={vm.activeDiscussion?.id ?? null}
          onPublish={vm.handlePublishDiscussion}
          onClose={vm.handleCloseDiscussion}
          transcriptText={vm.transcriptText}
          setTranscriptText={vm.setTranscriptText}
          promptType={vm.promptType}
          setPromptType={vm.setPromptType}
          candidates={vm.candidates}
          isGenerating={vm.isGenerating}
          generationWarning={vm.generationWarning}
          onGenerate={vm.generateCandidates}
          onSelectCandidate={vm.selectCandidate}
          onRegenerate={vm.regenerateCandidates}
          onPublishAiCandidate={vm.handlePublishAiCandidate}
        />

        <ActiveRightPanel responses={vm.responses} />
      </div>
    </div>
  );
}
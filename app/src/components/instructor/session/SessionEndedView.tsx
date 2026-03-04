'use client';

import * as React from 'react';
import { SessionHeaderEnded } from '@/components/instructor/session/SessionHeaderEnded';
import { SplitView } from '@/components/instructor/session/SplitView';
import type { SessionVM } from '@/hooks/useSessionPage';
import type { DiscussionWithResponseCount } from '@/types/discussion';

export function SessionEndedView({ vm }: { vm: SessionVM }) {
  const lesson = vm.lesson;
  const [splitView, setSplitView] = React.useState(false);

  // Convert lessonDiscussions (with embedded responses) to DiscussionWithResponseCount
  const discussionsForSplit: DiscussionWithResponseCount[] = React.useMemo(
    () =>
      vm.lessonDiscussions.map((d) => ({
        ...d,
        response_count: (d.responses || []).length,
      })),
    [vm.lessonDiscussions],
  );

  if (splitView) {
    return (
      <SplitView
        discussions={discussionsForSplit}
        lessonId={lesson.id}
        onBack={() => setSplitView(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SessionHeaderEnded
        title={lesson.title}
        exporting={vm.exportingData}
        activating={vm.activatingLesson}
        onExport={vm.handleExportLessonData}
        onActivate={vm.handleActivate}
        onSplitView={() => setSplitView(true)}
      />

      <main className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-88px)]">
        <section className="border border-gray-200 rounded-lg p-4 h-full overflow-y-auto">
          <h2 className="text-lg font-semibold mb-3">Discussions and Responses</h2>

          {vm.historyLoading && <p className="text-gray-500">Loading lesson history...</p>}
          {vm.historyError && <p className="text-red-600 text-sm">{vm.historyError}</p>}

          {!vm.historyLoading &&
            !vm.historyError &&
            vm.lessonDiscussions.map((d) => (
              <div key={d.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                <p className="font-semibold">{d.prompt_text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Prompt time: {new Date(d.created_at).toLocaleString()}
                </p>

                <div className="mt-3 space-y-2">
                  {(d.responses || []).map((r: { id: string; response_text: string; created_at: string }) => (
                    <div key={r.id} className="bg-gray-50 rounded p-2">
                      <p className="text-sm">{r.response_text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Response time: {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </section>

        <div className="grid grid-rows-2 gap-6 h-full">
          <section className="border border-gray-200 rounded-lg p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-3">Transcript</h2>
            <p className="text-sm text-gray-500">No transcripts used.</p>
          </section>

          <section className="border border-gray-200 rounded-lg p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-3">Lecture Material</h2>
            <p className="text-sm text-gray-500">No lecture material uploaded.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

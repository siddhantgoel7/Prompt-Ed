'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';

import { useRealtime } from '@/lib/realtime/useRealtime';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import { truncateText } from '@/lib/utils';
import { fetchResponsesApi } from '@/lib/api/discussionsApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SplitViewProps {
  discussions: DiscussionWithResponseCount[];
  lessonId: string;
  onBack: () => void;
}

interface PaneState {
  selectedDiscussionId: string | null;
  responses: Response[];
  loading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */



/* ------------------------------------------------------------------ */
/*  DiscussionList – reusable list shown inside each pane              */
/* ------------------------------------------------------------------ */

function DiscussionList({
  discussions,
  onSelect,
}: {
  discussions: DiscussionWithResponseCount[];
  onSelect: (id: string) => void;
}) {
  const active = discussions.filter((d) => d.status === 'active');
  const closed = discussions.filter((d) => d.status === 'closed');

  const renderList = (list: DiscussionWithResponseCount[]) => {
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground py-4 text-center">No discussions</p>;
    }
    return (
      <div className="space-y-2">
        {list.map((d, idx) => (
          <Card
            key={d.id}
            className="cursor-pointer transition-colors hover:bg-gray-50"
            onClick={() => onSelect(d.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                {d.status === 'active' ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">Closed</Badge>
                )}
              </div>
              <p className="text-sm text-foreground/90 mb-2 leading-relaxed">
                {truncateText(d.prompt_text)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{d.response_count}</span>
                <span>{d.response_count === 1 ? 'response' : 'responses'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="active" className="flex-1">Active ({active.length})</TabsTrigger>
        <TabsTrigger value="closed" className="flex-1">Closed ({closed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-3">
        <ScrollArea className="h-[calc(100vh-180px)]">
          {renderList(active)}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="closed" className="mt-3">
        <ScrollArea className="h-[calc(100vh-180px)]">
          {renderList(closed)}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ */
/*  DiscussionDetail – shows prompt + responses for a selected disc.   */
/* ------------------------------------------------------------------ */

function DiscussionDetail({
  discussion,
  responses,
  loading,
  onBack,
}: {
  discussion: DiscussionWithResponseCount;
  responses: Response[];
  loading: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="text-sm font-medium leading-relaxed">{discussion.prompt_text}</p>
        <div className="mt-2">
          {discussion.status === 'active' ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
          ) : (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">Closed</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading responses...</p>
        ) : responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          <div className="space-y-2">
            {responses.map((r) => (
              <div key={r.id} className="bg-gray-50 rounded p-3">
                <p className="text-sm">{r.response_text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pane – manages selection + detail state for one side               */
/* ------------------------------------------------------------------ */

function Pane({
  label,
  discussions,
  lessonId,
}: {
  label: string;
  discussions: DiscussionWithResponseCount[];
  lessonId: string;
}) {
  const [state, setState] = React.useState<PaneState>({
    selectedDiscussionId: null,
    responses: [],
    loading: false,
  });

  const { channel, isConnected } = useRealtime(lessonId, 'instructor');

  // Fetch responses when a discussion is selected
  React.useEffect(() => {
    if (!state.selectedDiscussionId) return;

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    fetchResponsesApi(state.selectedDiscussionId, true)
      .then((data) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          responses: data,
          loading: false,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          responses: [],
          loading: false,
        }));
      });

    return () => { cancelled = true; };
  }, [state.selectedDiscussionId]);

  // Track the selected discussion ID in a ref so the listener stays stable
  const selectedIdRef = React.useRef(state.selectedDiscussionId);
  React.useEffect(() => {
    selectedIdRef.current = state.selectedDiscussionId;
  }, [state.selectedDiscussionId]);

  // Listen for real-time new responses (single listener per channel)
  React.useEffect(() => {
    if (!channel || !isConnected) return;

    channel.on('broadcast', { event: 'response:new' }, (payload: { payload?: { response?: Response } }) => {
      const newResponse = payload.payload?.response;
      if (newResponse && newResponse.discussion_id === selectedIdRef.current) {
        setState((prev) => {
          if (prev.responses.some((r) => r.id === newResponse.id)) return prev;
          return { ...prev, responses: [...prev.responses, newResponse] };
        });
      }
    });
  }, [channel, isConnected]);

  const selectedDiscussion = discussions.find((d) => d.id === state.selectedDiscussionId) ?? null;

  return (
    <div className="flex-1 border-r last:border-r-0 flex flex-col min-w-0">
      <div className="px-4 py-2 border-b bg-gray-50">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>

      {selectedDiscussion ? (
        <DiscussionDetail
          discussion={selectedDiscussion}
          responses={state.responses}
          loading={state.loading}
          onBack={() => setState({ selectedDiscussionId: null, responses: [], loading: false })}
        />
      ) : (
        <div className="p-4 flex-1 overflow-hidden">
          <DiscussionList
            discussions={discussions}
            onSelect={(id) => setState({ selectedDiscussionId: id, responses: [], loading: false })}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SplitView – full-screen overlay                                    */
/* ------------------------------------------------------------------ */

export function SplitView({ discussions, lessonId, onBack }: SplitViewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Session
        </Button>
        <span className="text-sm font-semibold">Split View</span>
        {/* Spacer for centering */}
        <div className="w-[140px]" />
      </header>

      {/* Two panes */}
      <div className="flex-1 flex min-h-0">
        <Pane label="Left" discussions={discussions} lessonId={lessonId} />
        <Pane label="Right" discussions={discussions} lessonId={lessonId} />
      </div>
    </div>
  );
}

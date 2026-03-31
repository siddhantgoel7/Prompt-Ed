// Scrollable list of past discussions shown in the sidebar, newest first, with response counts.
// Each card links to the discussion detail page for the current lesson.
'use client';

import * as React from 'react';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatTime } from '@/lib/utils';
import { useSessionContext } from './SessionContext';
import { RestartDiscussionButton } from './RestartDiscussionButton';


/** Renders a reverse-chronological list of discussion cards, highlighting the currently active one. */
export function DiscussionHistory({
    discussions,
    activeDiscussionId,
}: Readonly<{
    discussions: DiscussionWithResponseCount[];
    activeDiscussionId: string | null;
}>) {
    const params = useParams();
    const lessonId = params.lessonId as string;
    const { handleRestartDiscussion, lesson } = useSessionContext();

    if (discussions.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No discussions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start a discussion to see it here</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {[...discussions].reverse().map((d, index) => {
                const originalIndex = discussions.length - index;
                const isActive = d.id === activeDiscussionId;

                return (
                    <div key={d.id} className="relative group">
                        <Link
                            href={`/session/${lessonId}/discussion/${d.id}`}
                            className="block"
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <div
                                className="rounded-xl p-3 cursor-pointer transition-all duration-150"
                                style={isActive ? {
                                    background: 'rgba(45,158,45,0.08)',
                                    border: '1px solid var(--color-primary-500)',
                                } : {
                                    background: 'var(--surface-raised)',
                                    border: '1px solid var(--border-default)',
                                }}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-xs font-semibold text-content-muted">#{originalIndex}</span>

                                    {d.status === 'active' ? (
                                        <span
                                            className="text-xs font-medium px-2 py-0.5 rounded-full text-brand-500"
                                            style={{ background: 'rgba(45,158,45,0.12)' }}
                                        >
                                            Active
                                        </span>
                                    ) : (
                                        <span
                                            className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-overlay text-content-muted"
                                        >
                                            Closed
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm mb-2 leading-relaxed text-content-primary line-clamp-3 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                    {d.prompt_text}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-content-muted">
                                    <span className="font-medium">{d.response_count}</span>
                                    <span>{d.response_count === 1 ? 'response' : 'responses'}</span>

                                    {d.published_at ? (
                                        <>
                                            <span>•</span>
                                            <span>{formatTime(d.published_at)}</span>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </Link>
                        
                        <RestartDiscussionButton
                            discussion={d}
                            onRestart={handleRestartDiscussion}
                            isLessonActive={lesson.status === 'active'}
                            size="sm"
                            className="absolute right-2 bottom-2 p-2 opacity-0 group-hover:opacity-100 bg-surface-base border-line-default text-content-muted hover:text-brand-500 hover:border-brand-500 hover:shadow-lg"
                        />
                    </div>
                );
            })}
        </div>
    );
}

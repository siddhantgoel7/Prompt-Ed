// Scrollable list of past discussions shown in the sidebar, newest first, with response counts.
// Each card links to the discussion detail page for the current lesson.
'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatTime, truncateText } from '@/lib/utils';


/** Renders a reverse-chronological list of discussion cards, highlighting the currently active one. */
export function DiscussionHistory({
    discussions,
    activeDiscussionId,
}: {
    discussions: DiscussionWithResponseCount[];
    activeDiscussionId: string | null;
}) {
    const params = useParams();
    const lessonId = params.lessonId as string;

    if (discussions.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No discussions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start a discussion to see it here</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {[...discussions].reverse().map((d, index) => {
                const originalIndex = discussions.length - index;
                const isActive = d.id === activeDiscussionId;

                return (
                    <Link
                        key={d.id}
                        href={`/session/${lessonId}/discussion/${d.id}`}
                        className="block"
                    >
                        <Card
                            className={[
                                'cursor-pointer transition-colors',
                                isActive ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'
                            ].join(' ')}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-xs font-semibold text-muted-foreground">#{originalIndex}</span>

                                    {d.status === 'active' ? (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                            Closed
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-sm text-foreground/90 mb-2 leading-relaxed">
                                    {truncateText(d.prompt_text)}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium">{d.response_count}</span>
                                    <span>{d.response_count === 1 ? 'response' : 'responses'}</span>

                                    {d.published_at ? (
                                        <>
                                            <span>•</span>
                                            <span>{formatTime(d.published_at)}</span>
                                        </>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}

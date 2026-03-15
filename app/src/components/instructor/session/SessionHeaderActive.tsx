// Header bar for an active lesson session with the lesson title, join code, and control buttons.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import { SessionContext } from './SessionContext';

/**
 * Active-session header with lesson title, join PIN code, Display/End/Split View/Settings buttons.
 * Reads values from SessionContext when available, falling back to explicit props for testing.
 */
export function SessionHeaderActive(props: {
  title?: string;
  lessonId?: string;
  pinCode?: string | null;
  endingLesson?: boolean;
  onDisplay?: () => void;
  onEnd?: () => void;
  onSplitView: () => void;
}) {
  const context = React.useContext(SessionContext);
  const title = context ? context.lesson.title : props.title!;
  const lessonId = context ? context.lesson.id : props.lessonId;
  const pinCode = context ? context.lesson.pin_code : props.pinCode!;
  const endingLesson = context ? context.endingLesson : props.endingLesson!;
  const onDisplay = context ? context.handleDisplay : props.onDisplay!;
  const onEnd = context ? context.handleEnd : props.onEnd!;
  const onSplitView = props.onSplitView;
  const [joinUrl, setJoinUrl] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!lessonId) {
      setJoinUrl(null);
      setQrDataUrl(null);
      return;
    }

    const url = `${window.location.origin}/student/${lessonId}`;
    setJoinUrl(url);

    let cancelled = false;
    QRCode.toDataURL(url, { width: 96, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  return (
    <header className="border-b border-gray-300 px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-lg md:text-xl font-semibold truncate">{title}</h1>

      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          {joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open student lesson link"
              className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 border border-gray-300 flex items-center justify-center text-[10px] overflow-hidden"
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Join lesson QR code"
                  className="w-full h-full object-cover"
                />
              ) : (
                'QR'
              )}
            </a>
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs">
              QR
            </div>
          )}
          <span className="font-semibold text-sm md:text-base">Join Code: {pinCode || '124567'}</span>
        </div>

        <Button size="sm" onClick={onDisplay}>Display</Button>

        {/* Keep label "End" for tests */}
        <Button size="sm" onClick={onEnd} disabled={endingLesson} variant="destructive">
          {endingLesson ? 'Ending...' : 'End'}
        </Button>

        <Button size="sm" variant="outline" onClick={onSplitView}>Split View</Button>

        <Button size="sm" variant="secondary">Settings</Button>
      </div>
    </header>
  );
}

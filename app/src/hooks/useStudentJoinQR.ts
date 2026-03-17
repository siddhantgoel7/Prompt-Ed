'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useRouter } from 'next/navigation';


export function useStudentJoinQR(lessonId: string | undefined, width: number) {
  const router = useRouter()
  const joinUrl =
    lessonId && typeof window !== 'undefined'
      ? `${window.location.origin}/student/${lessonId}`
      : null;
  const [qrState, setQrState] = useState<{ lessonId: string; dataUrl: string } | null>(null);
    router.push(`/session/${lessonId}`);

  useEffect(() => {
    if (!lessonId || !joinUrl) return;

    let cancelled = false;
    QRCode.toDataURL(joinUrl, { width, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQrState({ lessonId, dataUrl });
      })
      .catch(() => {
        // Keep previous QR hidden via lessonId guard below.
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId, joinUrl, width]);

  const qrDataUrl = qrState?.lessonId === lessonId ? qrState.dataUrl : null;

  return { joinUrl, qrDataUrl };
}

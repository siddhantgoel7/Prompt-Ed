'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function useStudentJoinQR(lessonId: string | undefined, width: number) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setJoinUrl(null);
      setQrDataUrl(null);
      return;
    }

    const url = `${window.location.origin}/student/${lessonId}`;
    setJoinUrl(url);

    let cancelled = false;
    QRCode.toDataURL(url, { width, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId, width]);

  return { joinUrl, qrDataUrl };
}

// Full-page instructor display view for projecting join information (PIN + QR code).
'use client';

import * as React from 'react';
import QRCode from 'qrcode';

export function SessionDisplayView(props: {
  lessonId: string;
  title: string;
  pinCode: string | null;
}) {
  const { lessonId, title, pinCode } = props;
  const [joinUrl, setJoinUrl] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = `${window.location.origin}/student/${lessonId}`;
    setJoinUrl(url);

    let cancelled = false;
    QRCode.toDataURL(url, { width: 520, margin: 1 })
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
    <main className="min-h-screen bg-white text-black px-8 py-10 md:px-12 md:py-12">
      <header className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Live Session</p>
        <h1 className="mt-2 text-3xl md:text-5xl font-semibold">{title}</h1>
      </header>

      <section className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 md:p-12 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Join PIN</p>
          <p className="mt-4 text-6xl md:text-8xl font-bold tracking-[0.12em]">
            {pinCode ?? '------'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-12 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Scan To Join</p>
          <div className="mt-4 flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Join lesson QR code"
                className="w-64 h-64 md:w-80 md:h-80"
              />
            ) : (
              <div className="w-64 h-64 md:w-80 md:h-80 border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500">
                Generating QR...
              </div>
            )}
          </div>
          {joinUrl ? <p className="mt-4 text-sm text-gray-600 break-all">{joinUrl}</p> : null}
        </div>
      </section>
    </main>
  );
}

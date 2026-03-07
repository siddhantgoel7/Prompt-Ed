'use client';

import * as React from 'react';

// ─── Audio recorder hook (US 1.17) ───────────────────────────────────────────

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = React.useState(false);
    const [elapsed, setElapsed] = React.useState(0);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const start = React.useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.start(500);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
        } catch {
            alert('Microphone access denied. Please allow microphone access and try again.');
        }
    }, []);

    const stop = React.useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder) { resolve(new Blob([])); return; }
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                recorder.stream.getTracks().forEach((t) => t.stop());
                resolve(blob);
            };
            recorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        });
    }, []);

    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return { isRecording, elapsed, fmt, start, stop };
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type ViewState = 'checking-auth' | 'ready' | 'joining';

function isValidPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export function useHomeJoin() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [view, setView] = useState<ViewState>('checking-auth');
  const [error, setError] = useState<string | null>(null);

  const pinOk = useMemo(() => isValidPin(code.trim()), [code]);

  // Auth gate: if instructor is logged in, send to dashboard
  useEffect(() => {
    let cancelled = false;

    async function check() {
      setView('checking-auth');
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      // If auth call fails, we still allow join flow (don’t brick home page)
      if (authError) {
        console.warn('Auth check failed:', authError);
        setView('ready');
        return;
      }

      if (user) {
        router.push('/instructor_dashboard');
        return;
      }

      setView('ready');
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const onChangeCode = useCallback((value: string) => {
    // keep digits only, max 6 (nice UX)
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
  }, []);

  const goSignUp = useCallback(() => router.push('/create_instructor'), [router]);
  const goLogIn = useCallback(() => router.push('/login_instructor'), [router]);

  const join = useCallback(async () => {
    setError(null);

    const pin = code.trim();

    if (!isValidPin(pin)) {
      setError('PIN must be 6 digits');
      return;
    }

    setView('joining');

    const supabase = createClient();

    const { data: lesson, error: lookupError } = await supabase
      .from('lessons')
      .select('id, status')
      .eq('pin_code', pin)
      .single();

    // If it doesn’t exist or query failed → invalid
    if (lookupError || !lesson) {
      setError('Invalid PIN. Please try again.');
      setView('ready');
      return;
    }

    // Enforce status rules (matches your original intent)
    if (lesson.status !== 'active') {
      setError(lesson.status === 'ended' ? 'This lesson has ended.' : 'Lesson is not active.');
      setView('ready');
      return;
    }

    router.push(`/student/${lesson.id}`);
  }, [code, router]);

  return {
    code,
    onChangeCode,
    join,
    goSignUp,
    goLogIn,
    view,
    error,
    pinOk,
  };
}

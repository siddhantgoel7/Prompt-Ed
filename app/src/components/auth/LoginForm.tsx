// Email/password login form for instructors, with Google OAuth as an alternative option.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signInWithGoogle } from '@/lib/supabase/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OAuthButton } from './OAuthButton';

type LoginFormData = {
  email: string;
  password: string;
};

/** Renders the sign-in form with email/password fields and a Google OAuth button. */
export function LoginForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setField = (name: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signInWithEmail(formData.email, formData.password);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/instructor_dashboard');
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => setField('email', e.target.value)}
          placeholder="your@ualberta.ca"
          required
          autoComplete="email"
          className="w-full px-4 py-3 rounded-[10px] text-sm transition-all duration-150"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={(e) => setField('password', e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-[10px] text-sm transition-all duration-150"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-[10px] text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 btn-primary-glow"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
        }}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>OR</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
      </div>

      <OAuthButton loading={loading} onClick={handleGoogleSignIn} providerLabel="Google" />

      <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
        Don&apos;t have an account?{' '}
        <button
          onClick={() => router.push('/create_instructor')}
          className="font-medium transition-colors duration-150 hover:underline"
          style={{ color: 'var(--color-primary-500)' }}
          type="button"
        >
          Sign Up
        </button>
      </p>
    </form>
  );
}

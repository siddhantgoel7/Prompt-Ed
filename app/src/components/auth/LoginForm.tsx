// Email/password login form for instructors, with Google OAuth as an alternative option.
// Styling uses shared CSS utility classes from globals.css (.form-label, .input-glass,
// .btn-submit) to keep the JSX concise and stay in sync with SignUpForm.
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

  /** Generic field setter — avoids a separate onChange handler per field. */
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

    // On success Supabase sets the auth cookie automatically; redirect to dashboard.
    router.push('/instructor_dashboard');
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
      setLoading(false);
      // On success the OAuth redirect handles navigation — no explicit push needed.
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-5">
      {/* Email field — HTML5 required + type="email" handles basic validation */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => setField('email', e.target.value)}
          placeholder="your@ualberta.ca"
          required
          autoComplete="email"
          className="input-glass"
        />
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="form-label">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={(e) => setField('password', e.target.value)}
          required
          autoComplete="current-password"
          className="input-glass"
        />
      </div>

      {/* Supabase error (e.g. invalid credentials, network error) */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Primary submit — disabled while the Supabase request is in-flight */}
      <button type="submit" disabled={loading} className="btn-submit">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Divider between email/password and OAuth */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-line-default" />
        <span className="text-xs text-content-muted">OR</span>
        <div className="flex-1 h-px bg-line-default" />
      </div>

      <OAuthButton loading={loading} onClick={handleGoogleSignIn} providerLabel="Google" />

      <p className="text-sm text-center text-content-muted">
        Don&apos;t have an account?{' '}
        <button
          onClick={() => router.push('/create_instructor')}
          className="font-medium transition-colors duration-150 hover:underline text-brand-500"
          type="button"
        >
          Sign Up
        </button>
      </p>
    </form>
  );
}

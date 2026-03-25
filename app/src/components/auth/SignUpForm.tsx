// Instructor sign-up form with email/password fields, UAlberta domain enforcement,
// duplicate-account checking, and Google OAuth as an alternative.
//
// Validation order (intentional — cheapest checks run first):
//   1. agreeToTerms — no network call needed
//   2. password length — no network call needed
//   3. @ualberta.ca domain — no network call needed
//   4. /api/auth/check-email — one round-trip to detect existing accounts before
//      calling Supabase, so we can show a friendlier error than Supabase's generic one
//   5. signUpWithEmail — the actual Supabase auth call
//
// Styling shares .form-label, .input-glass, and .btn-submit from globals.css to stay
// consistent with LoginForm without duplicating style objects.
'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/supabase/auth';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { OAuthButton } from './OAuthButton';
import { EmailConfirmation } from './EmailConfirmation';

type SignUpFormData = {
  fullName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
};

/** Renders the instructor registration form; switches to EmailConfirmation after successful sign-up. */
export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = React.useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false,
  });

  const [error, setError] = React.useState<string | null>(searchParams.get('error'));
  const [loading, setLoading] = React.useState(false);
  const [confirmedEmail, setConfirmedEmail] = React.useState<string | null>(null);

  const setField = <K extends keyof SignUpFormData>(
    key: K,
    value: SignUpFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // --- Client-side guards (no network) ---
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms and Conditions');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Only UAlberta instructors are allowed to register via email/password.
    if (!formData.email.endsWith('@ualberta.ca')) {
      setError('You must use a UAlberta email address (@ualberta.ca)');
      setLoading(false);
      return;
    }

    // --- Duplicate-account check (one round-trip before Supabase) ---
    // We check /api/auth/check-email first because Supabase's own duplicate error
    // message is generic; this lets us show a more helpful "use Google instead" prompt.
    const checkRes = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email }),
    });
    const checkData = await checkRes.json();

    if (checkData.exists) {
      setError('An account with this email already exists. Please sign in with Google instead.');
      setLoading(false);
      return;
    }

    // --- Supabase sign-up ---
    const { error } = await signUpWithEmail(
      formData.email,
      formData.password,
      formData.fullName
    );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Success — switch to email confirmation screen.
    setConfirmedEmail(formData.email);
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (confirmedEmail) {
    return (
      <EmailConfirmation
        email={confirmedEmail}
        onGoToLogin={() => router.push('/login_instructor')}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="form-label">Full Name</label>
        <input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => setField('fullName', e.target.value)}
          required
          className="input-glass"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setField('email', e.target.value)}
          placeholder="your@ualberta.ca"
          required
          className="input-glass"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="form-label">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setField('password', e.target.value)}
          required
          className="input-glass"
        />
        <p className="text-xs text-content-muted">
          Must be at least 8 characters
        </p>
      </div>

      <div className="flex items-start gap-2.5 pt-1">
        <input
          type="checkbox"
          id="agreeToTerms"
          checked={formData.agreeToTerms}
          onChange={(e) => setField('agreeToTerms', e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-[var(--color-primary-500)]"
        />
        <label htmlFor="agreeToTerms" className="text-sm text-content-muted">
          I agree to the Terms and Privacy Policy
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <button type="submit" disabled={loading} className="btn-submit">
        {loading ? 'Signing up…' : 'Create Account'}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-line-default" />
        <span className="text-xs text-content-muted">OR</span>
        <div className="flex-1 h-px bg-line-default" />
      </div>

      <OAuthButton loading={loading} onClick={handleGoogleSignUp} providerLabel="Google" />

      <p className="text-sm text-center text-content-muted">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => router.push('/login_instructor')}
          className="font-medium transition-colors duration-150 hover:underline text-brand-500"
        >
          Sign In
        </button>
      </p>
    </form>
  );
}

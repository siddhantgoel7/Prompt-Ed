// Instructor sign-up form with email/password fields, UAlberta domain enforcement,
// duplicate-account checking, and Google OAuth as an alternative.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/supabase/auth';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { OAuthButton } from './OAuthButton';
import { EmailConfirmation } from './EmailConfirmation';
import { useSearchParams } from 'next/navigation';

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
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false,
  });

  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [loading, setLoading] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

  const setField = <K extends keyof SignUpFormData>(
    key: K,
    value: SignUpFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

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

    if (!formData.email.endsWith('@ualberta.ca')) {
      setError('You must use a UAlberta email address (@ualberta.ca)');
      setLoading(false);
      return;
    }

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

  const inputClass = `
    w-full px-4 py-3 rounded-[10px] text-sm transition-all duration-150
  `;
  const inputStyle = {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  };
  const labelStyle = { color: 'var(--text-secondary)' };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-sm font-medium" style={labelStyle}>
          Full Name
        </label>
        <input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => setField('fullName', e.target.value)}
          required
          className={inputClass}
          style={inputStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium" style={labelStyle}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setField('email', e.target.value)}
          placeholder="your@ualberta.ca"
          required
          className={inputClass}
          style={inputStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium" style={labelStyle}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setField('password', e.target.value)}
          required
          className={inputClass}
          style={inputStyle}
        />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
        <label htmlFor="agreeToTerms" className="text-sm" style={{ color: 'var(--text-muted)' }}>
          I agree to the Terms and Privacy Policy
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-[10px] text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 btn-primary-glow"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
        }}
      >
        {loading ? 'Signing up…' : 'Create Account'}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>OR</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
      </div>

      <OAuthButton loading={loading} onClick={handleGoogleSignUp} providerLabel="Google" />

      <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => router.push('/login_instructor')}
          className="font-medium transition-colors duration-150 hover:underline"
          style={{ color: 'var(--color-primary-500)' }}
        >
          Sign In
        </button>
      </p>
    </form>
  );
}

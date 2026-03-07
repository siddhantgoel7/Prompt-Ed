'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/supabase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OAuthButton } from './OAuthButton';
import { EmailConfirmation } from './EmailConfirmation';

type SignUpFormData = {
  fullName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
};

type SignUpFormProps = {
  initialError?: string | null;
};

export function SignUpForm({ initialError }: SignUpFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false,
  });

  const [error, setError] = useState<string | null>(initialError ?? null);
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

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => setField('fullName', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setField('email', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setField('password', e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters
          </p>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={formData.agreeToTerms}
            onChange={(e) => setField('agreeToTerms', e.target.checked)}
          />
          <span className="text-sm text-muted-foreground">
            I agree to the Terms and Privacy Policy
          </span>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButton
        loading={loading}
        onClick={handleGoogleSignUp}
        providerLabel="Google"
      />

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => router.push('/login_instructor')}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sign In
        </button>
      </p>
    </>
  );
}

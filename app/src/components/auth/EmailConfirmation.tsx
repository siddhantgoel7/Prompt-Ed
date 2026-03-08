// Success screen shown after email sign-up, prompting the user to check their inbox.
'use client';

import { Button } from '@/components/ui/button';

type EmailConfirmationProps = {
  email: string;
  onGoToLogin: () => void;
};

/** Displays a confirmation message with the user's email and a button to navigate to login. */
export function EmailConfirmation({ email, onGoToLogin }: EmailConfirmationProps) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <span className="text-green-600 text-2xl">✓</span>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We’ve sent a confirmation link to:
        </p>
        <p className="font-medium">{email}</p>
      </div>

      <Button className="w-full" onClick={onGoToLogin}>
        Go to Login
      </Button>

      <p className="text-sm text-muted-foreground">
        Didn’t receive it? Check your spam folder.
      </p>
    </div>
  );
}

// Instructor sign-up page — wraps SignUpForm in a Suspense boundary (required for useSearchParams).
'use client';

import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function CreateInstructorPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Sign up to start managing your courses"
    >
      <Suspense fallback={
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--color-primary-400)',
                  animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      }>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
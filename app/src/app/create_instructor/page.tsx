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
      <Suspense fallback={<div>Loading...</div>}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
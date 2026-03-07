import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';

function SignUpFormWithParams() {
  const searchParams = useSearchParams();
  return <SignUpForm initialError={searchParams.get('error')} />;
}

export default function CreateInstructorPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Sign up to start managing your courses"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <SignUpFormWithParams />
      </Suspense>
    </AuthShell>
  );
}
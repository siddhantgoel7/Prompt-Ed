import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function CreateInstructorPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Sign up to start managing your courses"
    >
      <SignUpForm />
    </AuthShell>
  );
}

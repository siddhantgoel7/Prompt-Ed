// Instructor login page — wraps the LoginForm in the AuthShell centered card layout.
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" description="Sign in to your instructor account">
      <LoginForm />
    </AuthShell>
  );
}

// Generic OAuth sign-in button used on both login and sign-up forms.
import { Button } from '@/components/ui/button';

type OAuthButtonProps = {
  loading?: boolean;
  onClick: () => void;
  providerLabel: string; // e.g. "Google"
};

/** Renders an outline button labeled "Continue with {providerLabel}" for OAuth sign-in. */
export function OAuthButton({ loading, onClick, providerLabel }: Readonly<OAuthButtonProps>) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={loading}
      type="button"
    >
      Continue with {providerLabel}
    </Button>
  );
}
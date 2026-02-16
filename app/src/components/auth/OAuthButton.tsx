import { Button } from '@/components/ui/button';

type OAuthButtonProps = {
  loading?: boolean;
  onClick: () => void;
  providerLabel: string; // e.g. "Google"
};

export function OAuthButton({ loading, onClick, providerLabel }: OAuthButtonProps) {
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
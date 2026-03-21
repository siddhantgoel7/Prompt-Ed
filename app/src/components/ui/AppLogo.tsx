import Image from 'next/image';

type AppLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 'simple' = just the wordmark (no tagline), 'full' = wordmark + tagline */
  variant?: 'simple' | 'full';
  className?: string;
};

const sizes = {
  sm: { width: 150, height: 44 },
  md: { width: 220, height: 65 },
  lg: { width: 320, height: 94 },
  xl: { width: 640, height: 188 },
};

/** The PromptED logo — simple (no tagline) or full (with tagline). Adapts for dark/light mode. */
export function AppLogo({ size = 'md', variant = 'simple', className = '' }: AppLogoProps) {
  const { width, height } = sizes[size];
  const src = variant === 'full' ? '/prompted_logo.svg' : '/prompted_logo_simple.svg';

  return (
    <Image
      src={src}
      alt="PromptED"
      width={width}
      height={height}
      priority
      className={`logo-dark-adaptive ${className}`}
      style={{ height: 'auto', maxWidth: '100%' }}
    />
  );
}

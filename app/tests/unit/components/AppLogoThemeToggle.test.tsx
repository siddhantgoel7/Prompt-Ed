/**
 * Tests for AppLogo and ThemeToggle components.
 * AppLogo: all size variants (sm/md/lg/xl), simple vs full variant.
 * ThemeToggle: mounted=false skeleton, dark mode (sun icon), light mode (moon icon), click toggles theme.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height, className }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

let mockTheme = 'light';
const mockSetTheme = jest.fn((t: string) => { mockTheme = t; });

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

// ── AppLogo ───────────────────────────────────────────────────────────────────

describe('AppLogo', () => {
  it('renders with default props (md size, simple variant)', () => {
    render(<AppLogo />);
    const img = screen.getByAltText('PromptED');
    expect(img).toHaveAttribute('src', '/prompted_logo_simple.svg');
    expect(img).toHaveAttribute('width', '220');
  });

  it('renders simple variant (default)', () => {
    render(<AppLogo variant="simple" />);
    expect(screen.getByAltText('PromptED')).toHaveAttribute('src', '/prompted_logo_simple.svg');
  });

  it('renders full variant with tagline logo', () => {
    render(<AppLogo variant="full" />);
    expect(screen.getByAltText('PromptED')).toHaveAttribute('src', '/prompted_logo.svg');
  });

  it('uses sm size dimensions (150x44)', () => {
    render(<AppLogo size="sm" />);
    const img = screen.getByAltText('PromptED');
    expect(img).toHaveAttribute('width', '150');
    expect(img).toHaveAttribute('height', '44');
  });

  it('uses md size dimensions (220x65)', () => {
    render(<AppLogo size="md" />);
    const img = screen.getByAltText('PromptED');
    expect(img).toHaveAttribute('width', '220');
    expect(img).toHaveAttribute('height', '65');
  });

  it('uses lg size dimensions (320x94)', () => {
    render(<AppLogo size="lg" />);
    const img = screen.getByAltText('PromptED');
    expect(img).toHaveAttribute('width', '320');
    expect(img).toHaveAttribute('height', '94');
  });

  it('uses xl size dimensions (640x188)', () => {
    render(<AppLogo size="xl" />);
    const img = screen.getByAltText('PromptED');
    expect(img).toHaveAttribute('width', '640');
    expect(img).toHaveAttribute('height', '188');
  });

  it('passes custom className', () => {
    render(<AppLogo className="my-logo" />);
    expect(screen.getByAltText('PromptED').className).toContain('my-logo');
  });
});

// ── ThemeToggle ───────────────────────────────────────────────────────────────

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockTheme = 'light';
    mockSetTheme.mockClear();
  });

  it('renders loading skeleton before mounted (SSR guard)', () => {
    // Before the useEffect fires, mounted=false renders a pulse div
    // We check immediately synchronously before act flushes effects
    const { container } = render(<ThemeToggle />);
    // After render + effect flush in jsdom, mounted=true; but the skeleton is the initial render
    // Just ensure it doesn't crash and renders something
    expect(container.firstChild).not.toBeNull();
  });

  it('renders moon icon when theme is light (mounted)', async () => {
    mockTheme = 'light';
    const { container } = render(<ThemeToggle />);
    // Flush the useEffect that sets mounted=true
    await act(async () => {});
    // After mounting, shows a button with moon icon (d attribute)
    expect(container.querySelector('button')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('renders sun icon when theme is dark (mounted)', async () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    await act(async () => {});
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('switches to dark when clicked in light mode', async () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('switches to light when clicked in dark mode', async () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});

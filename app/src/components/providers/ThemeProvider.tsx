'use client';

// Wraps the app with next-themes to support light/dark/system theme switching.
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
    >
      <TooltipProvider delayDuration={300}>
        {children}
      </TooltipProvider>
    </NextThemesProvider>
  );
}

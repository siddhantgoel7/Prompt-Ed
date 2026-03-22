/**
 * Custom render utility that wraps components with all required providers.
 * Use this instead of importing directly from @testing-library/react in
 * component tests that use Radix UI primitives (Tooltip, Dialog, etc.).
 *
 * Drop-in replacement: all @testing-library/react exports are re-exported here,
 * with `render` overridden to include TooltipProvider.
 */
import * as React from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';

function Providers({ children }: { children: React.ReactNode }) {
  return React.createElement(TooltipProvider, null, children);
}

export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}

// Re-export everything else from RTL unchanged
export * from '@testing-library/react';

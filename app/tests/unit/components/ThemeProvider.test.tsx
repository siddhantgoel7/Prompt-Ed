import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

// Mock next-themes
jest.mock('next-themes', () => ({
    ThemeProvider: ({ children }: any) => <div data-testid="next-themes-provider">{children}</div>,
}));

// Mock tooltip provider
jest.mock('@/components/ui/tooltip', () => ({
    TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
}));

describe('ThemeProvider', () => {
    it('renders children wrapped in next-themes and tooltip provider', () => {
        render(
            <ThemeProvider>
                <div data-testid="test-child">Content</div>
            </ThemeProvider>
        );
        
        expect(screen.getByTestId('next-themes-provider')).toBeInTheDocument();
        expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
});

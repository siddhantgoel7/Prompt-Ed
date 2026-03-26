import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlurText } from '@/components/ui/BlurText';
import { AuthShell } from '@/components/auth/AuthShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/card';

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

jest.mock('@/components/ui/AppLogo', () => ({
  AppLogo: () => <div data-testid="app-logo" />,
}));

describe('UI Basics Coverage', () => {
    describe('BlurText', () => {
        it('renders characters with staggered animation delays', () => {
            const { container } = render(<BlurText text="hi" initialDelay={100} staggerMs={50} />);
            const spans = container.querySelectorAll('span > span');
            expect(spans).toHaveLength(2);
            expect((spans[0] as HTMLElement).style.animationDelay).toBe('100ms');
            expect((spans[1] as HTMLElement).style.animationDelay).toBe('150ms');
        });

        it('replaces spaces with non-breaking spaces', () => {
            const { container } = render(<BlurText text="a b" />);
            const spans = container.querySelectorAll('span > span');
            expect(spans[1].textContent).toBe('\u00A0');
        });
    });

    describe('AuthShell', () => {
        it('renders title, description and children', () => {
            render(
                <AuthShell title="Test Title" description="Test Desc">
                    <button>Child</button>
                </AuthShell>
            );
            expect(screen.getByText('Test Title')).toBeInTheDocument();
            expect(screen.getByText('Test Desc')).toBeInTheDocument();
            expect(screen.getByText('Child')).toBeInTheDocument();
            expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
            expect(screen.getByTestId('app-logo')).toBeInTheDocument();
        });

        it('renders without description', () => {
            render(<AuthShell title="Only Title">Content</AuthShell>);
            expect(screen.queryByText('Test Desc')).not.toBeInTheDocument();
        });
    });

    describe('Card Components', () => {
        it('renders card subcomponents with correct class names', () => {
            render(
                <Card className="custom-card">
                    <CardHeader className="custom-header">
                        <CardTitle className="custom-title">Title</CardTitle>
                        <CardDescription className="custom-desc">Desc</CardDescription>
                        <CardAction className="custom-action">Action</CardAction>
                    </CardHeader>
                    <CardContent className="custom-content">Content</CardContent>
                    <CardFooter className="custom-footer">Footer</CardFooter>
                </Card>
            );
            
            expect(screen.getByText('Title')).toHaveClass('custom-title');
            expect(screen.getByText('Desc')).toHaveClass('custom-desc');
            expect(screen.getByText('Action')).toHaveClass('custom-action');
            expect(screen.getByText('Content')).toHaveClass('custom-content');
            expect(screen.getByText('Footer')).toHaveClass('custom-footer');
        });
    });
});

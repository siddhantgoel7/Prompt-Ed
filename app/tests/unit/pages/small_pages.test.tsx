import React from 'react';
import { render, screen } from '@testing-library/react';
import DisplayPage from '@/app/session/[lessonId]/display/page';
import LoginInstructorPage from '@/app/login_instructor/page';
import CreateInstructorPage from '@/app/create_instructor/page';
import SessionPageWrapper from '@/app/session/[lessonId]/page';
import SmallStudentPage from '@/app/student/[lessonId]/page';
import Home from '@/app/page';

jest.mock('next/navigation', () => ({
    __esModule: true,
    useParams: () => ({ lessonId: 'l1' }),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
    redirect: jest.fn(),
}));

jest.mock('@/app/session/[lessonId]/display_code', () => ({
    DisplayCodeState: ({ code, state }: any) => <div data-testid="display-code">{code}-{state ? 'active' : 'inactive'}</div>,
}));

jest.mock('@/components/instructor/SessionPage', () => ({
    SessionPage: ({ lessonId }: any) => <div data-testid="instructor-session">{lessonId}</div>,
}));

jest.mock('@/components/student/session/StudentSessionPage', () => ({
    StudentSessionPage: ({ lessonId }: any) => <div data-testid="student-session">{lessonId}</div>,
}));

jest.mock('@/components/shared/home/HomeJoin', () => ({
    HomeJoin: () => <div data-testid="home-join" />,
}));

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn().mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'l1', join_code: '123456', is_active: true } })
    }),
}));

import { TooltipProvider } from '@/components/ui/tooltip';

describe('Small Page Coverage', () => {
    const renderWrapped = (ui: any) => render(<TooltipProvider>{ui}</TooltipProvider>);

    it('hits async page logic', async () => {
        await (DisplayPage as any)({ params: Promise.resolve({ lessonId: 'l1' }) });
        await (SessionPageWrapper as any)({ params: Promise.resolve({ lessonId: 'l1' }) });
        renderWrapped(<SmallStudentPage params={Promise.resolve({ lessonId: 'l1' })} />);
    });

    it('success: renders LoginInstructorPage', () => {
        renderWrapped(<LoginInstructorPage />);
        expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('success: renders CreateInstructorPage', () => {
        renderWrapped(<CreateInstructorPage />);
        expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('success: renders Home page', () => {
        renderWrapped(<Home />);
        expect(screen.getByTestId('home-join')).toBeInTheDocument();
    });
});

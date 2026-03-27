import React from 'react';
import { render, screen } from '@testing-library/react';
import DisplayCodeState from '@/app/session/[lessonId]/display_code';

describe('DisplayCodeState', () => {
    it('renders code when state is true', () => {
        render(<DisplayCodeState code="123456" state={true} />);
        expect(screen.getByText(/Join Code: 123456/i)).toBeInTheDocument();
        expect(screen.getByText(/Join Code: 123456/i).parentElement).toHaveClass('visible');
    });

    it('hides code when state is false', () => {
        render(<DisplayCodeState code="123456" state={false} />);
        expect(screen.getByText(/Join Code: 123456/i).parentElement).not.toHaveClass('visible');
    });

    it('returns null if no code', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const { container } = render(<DisplayCodeState code={null} state={true} />);
        expect(container).toBeEmptyDOMElement();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

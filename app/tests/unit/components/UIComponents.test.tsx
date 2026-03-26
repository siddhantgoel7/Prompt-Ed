import React from 'react';
import { render } from '@testing-library/react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

describe('UI Component Coverage', () => {
    it('renders all covered components', () => {
        const { rerender } = render(<Separator />);
        rerender(<Separator orientation="vertical" />);
        render(<Skeleton />);
        render(<Textarea />);
    });
});

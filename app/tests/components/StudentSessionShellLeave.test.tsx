/**
 * Component Tests — StudentSessionShell
 * User Story [US 2.13]: Leave a lesson as a student
 *
 * These tests verify the Leave button in StudentSessionShell:
 * - Leave button is rendered
 * - Clicking Leave navigates to home page
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentSessionShell } from '@/components/student/session/StudentSessionShell';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockClear();
});

describe('StudentSessionShell Component Tests [US 2.13]', () => {

  describe('Leave button rendering', () => {

    // 44.1
    it('[US 2.13][CT1] success: renders the Leave button', () => {
      render(<StudentSessionShell title="Test Lesson"><div /></StudentSessionShell>);
      expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
    });

    // 44.2
    it('[US 2.13][CT2] success: renders lesson title alongside Leave button', () => {
      render(<StudentSessionShell title="Pharmacology 101"><div /></StudentSessionShell>);
      expect(screen.getByText('Pharmacology 101')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
    });
  });

  describe('Leave button navigation', () => {

    // 44.3
    it('[US 2.13][CT3] success: clicking Leave navigates to home page', () => {
      render(<StudentSessionShell title="Test Lesson"><div /></StudentSessionShell>);
      fireEvent.click(screen.getByRole('button', { name: /leave/i }));
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    // 44.4
    it('[US 2.13][CT4] success: clicking Leave calls router.push exactly once', () => {
      render(<StudentSessionShell title="Test Lesson"><div /></StudentSessionShell>);
      fireEvent.click(screen.getByRole('button', { name: /leave/i }));
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });
});
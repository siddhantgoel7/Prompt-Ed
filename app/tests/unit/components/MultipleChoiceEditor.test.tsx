/**
 * Tests for MultipleChoiceEditor component.
 * Covers rendering options, selecting correct answer, and editing option text.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultipleChoiceEditor } from '@/components/instructor/session/MultipleChoiceEditor';

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <span>{children}</span>,
}));

const defaultOptions = [
  { label: 'A', text: 'Option A text' },
  { label: 'B', text: 'Option B text' },
  { label: 'C', text: 'Option C text' },
  { label: 'D', text: 'Option D text' },
];

function renderEditor(overrides: Partial<React.ComponentProps<typeof MultipleChoiceEditor>> = {}) {
  const props = {
    options: defaultOptions,
    correctOption: 'A',
    onCorrectOptionChange: jest.fn(),
    onOptionTextChange: jest.fn(),
    nameGroup: 'test-group',
    ...overrides,
  };
  return { ...render(<MultipleChoiceEditor {...props} />), props };
}

describe('MultipleChoiceEditor', () => {
  it('renders all four option labels', () => {
    renderEditor();
    expect(screen.getByDisplayValue('Option A text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option B text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option C text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option D text')).toBeInTheDocument();
  });

  it('renders four radio buttons', () => {
    renderEditor();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  it('checks the radio matching correctOption', () => {
    renderEditor({ correctOption: 'B' });
    const radios = screen.getAllByRole('radio');
    // Radio for B (index 1) should be checked
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it('calls onCorrectOptionChange when a radio is clicked', () => {
    const onCorrectOptionChange = jest.fn();
    renderEditor({ onCorrectOptionChange });
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[2]); // Click C
    expect(onCorrectOptionChange).toHaveBeenCalledWith('C');
  });

  it('calls onOptionTextChange when option text input changes', () => {
    const onOptionTextChange = jest.fn();
    renderEditor({ onOptionTextChange });
    const input = screen.getByDisplayValue('Option B text');
    fireEvent.change(input, { target: { value: 'New B text' } });
    expect(onOptionTextChange).toHaveBeenCalledWith('B', 'New B text');
  });

  it('renders the section header text', () => {
    renderEditor();
    expect(screen.getByText(/Options & Correct Answer/i)).toBeInTheDocument();
  });

  it('renders placeholder text for each option', () => {
    renderEditor({ options: [{ label: 'A', text: '' }] });
    expect(screen.getByPlaceholderText('Option A')).toBeInTheDocument();
  });
});

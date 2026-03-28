/**
 * Tests for HamburgerMenu component.
 * Covers: toggle open/close, Display QR/Code click, Split View click,
 * End Session click, endingLesson=true state, outside-click closes menu,
 * menu item mouseEnter/Leave (danger and non-danger), Settings disabled item.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HamburgerMenu } from '@/components/instructor/session/HamburgerMenu';

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderMenu(props: {
  onDisplay?: () => void;
  onSplitView?: () => void;
  onEnd?: () => void;
  endingLesson?: boolean;
} = {}) {
  const onDisplay = props.onDisplay ?? jest.fn();
  const onSplitView = props.onSplitView ?? jest.fn();
  const onEnd = props.onEnd ?? jest.fn();
  render(
    <HamburgerMenu
      onDisplay={onDisplay}
      onSplitView={onSplitView}
      onEnd={onEnd}
      endingLesson={props.endingLesson}
    />
  );
  return { onDisplay, onSplitView, onEnd };
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /session menu/i }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('HamburgerMenu', () => {
  it('renders the hamburger button with aria-expanded=false initially', () => {
    renderMenu();
    const btn = screen.getByRole('button', { name: /session menu/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the dropdown when clicked', () => {
    renderMenu();
    openMenu();
    expect(screen.getByText('Display QR/Code')).toBeInTheDocument();
    expect(screen.getByText('Split View')).toBeInTheDocument();
    expect(screen.getByText('End Session')).toBeInTheDocument();
  });

  it('closes the dropdown when hamburger is clicked again', () => {
    renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /session menu/i }));
    expect(screen.queryByText('Display QR/Code')).not.toBeInTheDocument();
  });

  it('calls onDisplay and closes menu when "Display QR/Code" is clicked', () => {
    const { onDisplay } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByText('Display QR/Code'));
    expect(onDisplay).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Display QR/Code')).not.toBeInTheDocument();
  });

  it('calls onSplitView and closes menu when "Split View" is clicked', () => {
    const { onSplitView } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByText('Split View'));
    expect(onSplitView).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Split View')).not.toBeInTheDocument();
  });

  it('calls onEnd and closes menu when "End Session" is clicked', () => {
    const { onEnd } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByText('End Session'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('End Session')).not.toBeInTheDocument();
  });

  it('shows "Ending…" and disables the End button when endingLesson=true', () => {
    renderMenu({ endingLesson: true });
    openMenu();
    const btn = screen.getByText('Ending…');
    expect(btn).toBeDisabled();
  });

  it('disables the Settings menu item', () => {
    renderMenu();
    openMenu();
    const settingsBtn = screen.getByText('Settings');
    expect(settingsBtn).toBeDisabled();
  });

  // ── Outside-click closes the menu ────────────────────────────────────────

  it('closes the menu when clicking outside the component', () => {
    renderMenu();
    openMenu();
    expect(screen.getByText('Display QR/Code')).toBeInTheDocument();

    // Simulate a mousedown event on the document body (outside the menu)
    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(screen.queryByText('Display QR/Code')).not.toBeInTheDocument();
  });

  it('does NOT close the menu when clicking inside the menu', () => {
    renderMenu();
    openMenu();
    const dropdown = screen.getByText('Display QR/Code').closest('div')!;
    // Dispatch mousedown on the dropdown itself — ref.current.contains(e.target) returns true
    act(() => {
      dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    // Menu should still be open
    expect(screen.getByText('Display QR/Code')).toBeInTheDocument();
  });

  // ── Menu item hover effects ───────────────────────────────────────────────

  it('applies primary background on mouseEnter for non-danger menu items', () => {
    renderMenu();
    openMenu();
    const displayBtn = screen.getByText('Display QR/Code');
    fireEvent.mouseEnter(displayBtn);
    expect(displayBtn.style.background).toBe('var(--color-primary-alpha-08)');
    fireEvent.mouseLeave(displayBtn);
    expect(displayBtn.style.background).toBe('transparent');
  });

  it('applies error background on mouseEnter for danger (End Session) menu item', () => {
    renderMenu();
    openMenu();
    const endBtn = screen.getByText('End Session');
    fireEvent.mouseEnter(endBtn);
    expect(endBtn.style.background).toBe('var(--color-error-alpha-10)');
    fireEvent.mouseLeave(endBtn);
    expect(endBtn.style.background).toBe('transparent');
  });

  it('applies primary background on mouseEnter for Split View item', () => {
    renderMenu();
    openMenu();
    const btn = screen.getByText('Split View');
    fireEvent.mouseEnter(btn);
    expect(btn.style.background).toBe('var(--color-primary-alpha-08)');
    fireEvent.mouseLeave(btn);
    expect(btn.style.background).toBe('transparent');
  });

  // ── Works without optional props ─────────────────────────────────────────

  it('does not throw when onDisplay/onSplitView/onEnd are undefined', () => {
    render(<HamburgerMenu />);
    // Click each item — menu closes after each click; reopen for the next
    openMenu();
    fireEvent.click(screen.getByText('Display QR/Code'));
    openMenu();
    fireEvent.click(screen.getByText('Split View'));
    openMenu();
    fireEvent.click(screen.getByText('End Session'));
  });
});

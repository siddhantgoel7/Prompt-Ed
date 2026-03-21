// Hamburger (☰) dropdown menu for the active session header.
// Extracted from SessionHeaderActive.tsx — self-contained with its own
// open/close state, outside-click detection, and menu item rendering.
//
// Items:
//   "Display QR/Code" — opens full-screen projector view (SessionDisplayView)
//   "Split View"      — enters split-screen mode showing slide + responses side by side
//   "Settings"        — placeholder (not yet wired)
//   "End Session"     — ends the lesson; shown in red as a destructive action
//
// The menu closes on any outside click via a document-level mousedown listener.
// The listener is only registered while the menu is open (guard: `if (!open) return`)
// to avoid unnecessary global event overhead.
'use client';

import * as React from 'react';

export function HamburgerMenu({
  onDisplay,
  onSplitView,
  onEnd,
  endingLesson,
}: {
  onDisplay?: () => void;
  onSplitView?: () => void;
  onEnd?: () => void;
  /** True while the end-lesson request is in-flight — disables the button to prevent double-firing. */
  endingLesson?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close the dropdown when the user clicks anywhere outside the menu wrapper.
  // The listener is added only when open=true and cleaned up when open=false,
  // so it never runs while the menu is hidden.
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const menuItems: { label: string; onClick?: () => void; danger?: boolean; disabled?: boolean }[] = [
    { label: 'Display QR/Code', onClick: () => { onDisplay?.(); setOpen(false); } },
    { label: 'Split View',      onClick: () => { onSplitView?.(); setOpen(false); } },
    { label: 'Settings' }, // TODO: wire up settings panel
    // "End Session" label is queried by name in Jest/Playwright tests — update those
    // tests if this text ever changes (previously a standalone button labeled "End").
    { label: endingLesson ? 'Ending…' : 'End Session', onClick: () => { onEnd?.(); setOpen(false); }, danger: true, disabled: endingLesson },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Session menu"
        aria-expanded={open}
        className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-[10px] transition-all duration-150"
        style={{
          background: open ? 'var(--color-primary-alpha-12)' : 'var(--surface-raised)',
          border: open ? '1px solid rgba(45,158,45,0.35)' : '1px solid var(--border-default)',
          color: open ? 'var(--color-primary-500)' : 'var(--text-secondary)',
        }}
      >
        <span className="block w-4 h-[2px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-4 h-[2px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-4 h-[2px] rounded-full" style={{ background: 'currentColor' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 rounded-2xl overflow-hidden bg-surface-overlay backdrop-blur-lg border border-line-default shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
          style={{ minWidth: '160px', zIndex: 100 }}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              disabled={item.disabled}
              className="w-full px-4 py-2.5 text-left text-sm font-medium transition-colors duration-100 disabled:opacity-50"
              style={{
                color: item.danger ? 'var(--color-error-500)' : 'var(--text-primary)',
                background: 'transparent',
                borderBottom: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = item.danger
                  ? 'var(--color-error-alpha-10)'
                  : 'var(--color-primary-alpha-08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable status alert banner for the student session (connection errors, lesson ended, etc.).
// src/components/student/session/StudentStatusAlert.tsx
'use client';

/** Renders an alert banner with a title and optional description. */
export function StudentStatusAlert({
  variant = 'default',
  title,
  description,
}: {
  variant?: 'default' | 'destructive';
  title: string;
  description?: string | null;
}) {
  const isDestructive = variant === 'destructive';

  const style: React.CSSProperties = isDestructive
    ? {
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderLeft: '3px solid #ef4444',
        borderRadius: '12px',
        padding: '12px 16px',
      }
    : {
        background: 'rgba(45,158,45,0.08)',
        border: '1px solid rgba(45,158,45,0.20)',
        borderLeft: '3px solid var(--color-primary-400)',
        borderRadius: '12px',
        padding: '12px 16px',
      };

  const titleColor = isDestructive ? '#dc2626' : 'var(--color-primary-600)';
  const descColor = isDestructive ? '#ef4444' : 'var(--text-secondary)';

  return (
    <div style={style} role="alert">
      <p className="text-sm font-semibold" style={{ color: titleColor }}>
        {title}
      </p>
      {description ? (
        <p className="text-sm mt-0.5" style={{ color: descColor }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

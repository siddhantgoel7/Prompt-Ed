// Reusable status alert banner for the student session (connection errors, lesson ended, etc.).
// src/components/student/session/StudentStatusAlert.tsx
'use client';

/** Renders an alert banner with a title and optional description. */
export function StudentStatusAlert({
  variant = 'default',
  title,
  description,
}: Readonly<{
  variant?: 'default' | 'destructive';
  title: string;
  description?: string | null;
}>) {
  const isDestructive = variant === 'destructive';

  const style: React.CSSProperties = isDestructive
    ? {
        background: 'var(--color-error-alpha-08)',
        border: '1px solid var(--color-error-alpha-25)',
        borderLeft: '3px solid var(--color-error-500)',
        borderRadius: '12px',
        padding: '12px 16px',
      }
    : {
        background: 'var(--color-primary-alpha-08)',
        border: '1px solid var(--color-primary-alpha-20)',
        borderLeft: '3px solid var(--color-primary-400)',
        borderRadius: '12px',
        padding: '12px 16px',
      };

  const titleColor = isDestructive ? 'var(--color-error-600)' : 'var(--color-primary-600)';
  const descColor = isDestructive ? 'var(--color-error-500)' : 'var(--text-secondary)';

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

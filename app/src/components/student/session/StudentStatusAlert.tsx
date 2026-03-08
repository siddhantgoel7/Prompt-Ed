// Reusable status alert banner for the student session (connection errors, lesson ended, etc.).
// src/components/student/session/StudentStatusAlert.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/** Renders an alert banner with a title and optional description in the given variant style. */
export function StudentStatusAlert({
  variant = 'default',
  title,
  description,
}: {
  variant?: 'default' | 'destructive';
  title: string;
  description?: string | null;
}) {
  return (
    <Alert variant={variant}>
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
    </Alert>
  );
}

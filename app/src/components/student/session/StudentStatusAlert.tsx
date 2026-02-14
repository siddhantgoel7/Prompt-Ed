// src/components/student/session/StudentStatusAlert.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

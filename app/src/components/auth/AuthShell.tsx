// Shared layout wrapper for auth pages (login, sign-up) that centers a card on screen.
import { PropsWithChildren } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AuthShellProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

/** Renders a centered card with a title and optional description, wrapping auth form content. */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </div>
  );
}
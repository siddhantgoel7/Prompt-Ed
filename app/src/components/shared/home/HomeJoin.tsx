'use client';

import { useHomeJoin } from '@/hooks/useHomeJoin';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export function HomeJoin() {
  const { code, onChangeCode, join, goSignUp, goLogIn, view, error, pinOk } = useHomeJoin();

  if (view === 'checking-auth') {
    return (
      <div className="min-h-[calc(100vh-1px)] bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const joining = view === 'joining';

  return (
    <div className="min-h-[calc(100vh-1px)] bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-foreground/10" />
            <span className="font-semibold">PMCOL Teaching Tool</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={goLogIn}>
              Log in
            </Button>
            <Button onClick={goSignUp}>Sign up</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 flex justify-center">
        <Card className="w-full max-w-lg shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Join a session</CardTitle>
            <CardDescription>Enter the 6-digit PIN provided by your instructor.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Can’t join</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="pin">PIN code</Label>
              <Input
                id="pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => onChangeCode(e.target.value)}
                disabled={joining}
              />
              <p className="text-xs text-muted-foreground">
                {code.length === 0
                  ? 'PIN is 6 digits.'
                  : pinOk
                    ? 'Looks good.'
                    : 'Enter exactly 6 digits.'}
              </p>
            </div>

            <Button className="w-full" onClick={join} disabled={joining || !pinOk}>
              {joining ? 'Joining…' : 'Join'}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              Instructors: use <span className="font-medium">Log in</span> to access your dashboard.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';

export function LessonsPageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <Button onClick={onBack}>Back</Button>
      </div>
    </header>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function StudentResponseForm({
  value,
  onChange,
  onSubmit,
  disabled,
  submitting,
  validationMessage,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  submitting: boolean;
  validationMessage?: string;
}) {
  const chars = value.length;

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your response here..."
        rows={6}
        disabled={submitting}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{chars} characters</span>
        <span className="hidden sm:inline">Be concise and specific</span>
      </div>
      {validationMessage ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {validationMessage}
        </p>
      ) : null}
      <Button className="w-full" onClick={onSubmit} disabled={disabled || submitting}>
        {submitting ? 'Submitting…' : 'Submit response'}
      </Button>
    </div>
  );
}
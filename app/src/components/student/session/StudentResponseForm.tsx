// Response submission form used by students for both free-text and multiple-choice discussions.
'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/** Renders (optionally) a textarea for free-text responses, a character counter, and a Submit button. */
export function StudentResponseForm({
  value,
  onChange,
  onSubmit,
  disabled,
  submitting,
  validationMessage,
  showTextarea = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  submitting: boolean;
  validationMessage?: string;
  /** Set to false to hide the textarea (e.g. for MC questions where selection is done via buttons). */
  showTextarea?: boolean;
}) {
  const chars = value.length;

  return (
    <div className="space-y-3">
      {showTextarea && (
        <>
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
        </>
      )}
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

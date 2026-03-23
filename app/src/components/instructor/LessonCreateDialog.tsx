// Modal dialog for creating a new lesson with a title input field.
'use client';

import * as React from 'react';
import { type FormEvent as ReactFormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Renders a dialog with a lesson title input and Create/Cancel buttons. */
export function LessonCreateDialog({
  open,
  onOpenChange,
  title,
  value,
  onChange,
  onSubmit,
  error,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: ReactFormEvent<HTMLFormElement>) => void;
  error: string | null;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-2">Lesson Title</Label>
            <Input
              name="title"
              value={value}
              onChange={onChange}
              placeholder="e.g., Intro to Pharmacology"
              required
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <div className="text-sm text-red-600">{error}</div>
            </Alert>
          )}

          <div className="flex gap-4 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Creating...' : 'Create Lesson'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import * as React from 'react';
import type { CreateCourseInput } from '@/types/course';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CourseDialog({
  open,
  onOpenChange,
  title,
  mode,
  value,
  onChange,
  onSubmit,
  error,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mode: 'add' | 'edit';
  value: CreateCourseInput;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  saving: boolean;
}) {
  const handleAddImage = React.useCallback(() => {
    // placeholder
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          {/* ✅ tests search for "Add a Course" */}
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-2">Course Title</Label>
            <Input
              type="text"
              name="title"
              value={value.title}
              onChange={onChange}
              placeholder="e.g., PMCOL 400 Lec A1"
              required
            />
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2">Course Image</Label>
            <button
              type="button"
              onClick={handleAddImage}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-500 hover:text-gray-700"
            >
              {mode === 'add' ? 'Click to add image' : 'Click to change image'}
            </button>
            <p className="text-xs text-gray-500 mt-1">Image upload coming soon</p>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <div className="text-sm text-red-600">{error}</div>
            </Alert>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>

            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (mode === 'add' ? 'Adding...' : 'Saving...') : mode === 'add' ? 'Add Course' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ConfirmDeleteLessonDialog({
  open,
  onOpenChange,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Lesson?</DialogTitle>
        </DialogHeader>

        <p className="text-gray-600">
          Are you sure you want to delete this lesson? This action cannot be undone.
        </p>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <div className="text-sm text-red-600">{error}</div>
          </Alert>
        )}

        <div className="flex gap-4 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={deleting} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700">
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

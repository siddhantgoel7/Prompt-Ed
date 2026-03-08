'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  error: string | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {description && <p className="text-gray-600">{description}</p>}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <div className="text-sm text-red-600">{error}</div>
          </Alert>
        )}

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={deleting} className="flex-1">
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

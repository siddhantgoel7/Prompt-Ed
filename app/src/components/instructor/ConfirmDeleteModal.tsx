'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function ConfirmDeleteModal({
  title,
  error,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  error: string | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>

        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this course? This will also delete all lessons associated with this course.
          This action cannot be undone.
        </p>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <div className="text-sm text-red-600">{error}</div>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={deleting} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

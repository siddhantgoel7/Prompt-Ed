// Modal dialog for adding or editing a course (title and optional image upload).
'use client';

import * as React from 'react';
import type { CreateCourseInput } from '@/types/course';
import { createClient } from '@/lib/supabase/client';

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

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Renders an add/edit course dialog with a title field and image upload. */
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
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mode: 'add' | 'edit';
  value: CreateCourseInput;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  error: string | null;
  saving: boolean;
}>) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);

  // Sync preview from existing image_url when editing
  React.useEffect(() => {
    if (open && value.image_url) {
      setPreviewUrl(value.image_url);
    } else if (open) {
      setPreviewUrl(null);
    }
    setImageError(null);
  }, [open, value.image_url]);

  const handleImageClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    // Validate type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Please select a PNG, JPEG, WebP, or GIF image.');
      return;
    }

    // Validate size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Image must be under 5 MB.');
      return;
    }

    setImageError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const storagePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setImageError('Failed to upload image. Please try again.');
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('course-images')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);

      // Propagate to form state via a synthetic-like change event
      const syntheticEvent = {
        target: { name: 'image_url', value: publicUrl },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    } catch {
      setImageError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleRemoveImage = React.useCallback(() => {
    setPreviewUrl(null);
    setImageError(null);
    const syntheticEvent = {
      target: { name: 'image_url', value: '' },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  }, [onChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          {/* tests search for "Add a Course" */}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
              data-testid="course-image-input"
            />

            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={previewUrl}
                  alt="Course preview"
                  className="w-full h-36 object-cover"
                  data-testid="course-image-preview"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <button
                    type="button"
                    onClick={handleImageClick}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/90 text-gray-700 hover:bg-white"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/90 text-red-600 hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleImageClick}
                disabled={uploading}
                className="w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                data-testid="course-image-upload-button"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-sm">{mode === 'add' ? 'Click to add image' : 'Click to change image'}</span>
                    <span className="text-xs text-gray-400">PNG, JPEG, WebP, or GIF (max 5 MB)</span>
                  </span>
                )}
              </button>
            )}

            {imageError && (
              <p className="text-xs text-red-500 mt-1">{imageError}</p>
            )}
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <div className="text-sm text-red-600">{error}</div>
            </Alert>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploading} className="flex-1">
              Cancel
            </Button>

            <Button type="submit" disabled={saving || uploading} className="flex-1">
              {(() => {
                if (saving) return mode === 'add' ? 'Adding...' : 'Saving...';
                return mode === 'add' ? 'Add Course' : 'Save Changes';
              })()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

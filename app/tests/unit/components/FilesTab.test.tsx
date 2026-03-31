/**
 * Tests for FilesTab component.
 * Covers: empty file list, file list rendering, upload button states,
 * handleFileChange (success + error + no-file), formatSize (KB and MB),
 * getStatusBadge (ready/processing/uploading/failed), delete button hover,
 * fileInputRef click trigger, input reset after upload.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilesTab } from '@/components/instructor/session/FilesTab';

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'f1',
    fileName: 'lecture.pdf',
    fileSizeBytes: 512000, // 500 KB
    status: 'ready',
    ...overrides,
  } as any;
}

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    files: [] as any[],
    isUploading: false,
    onUploadFile: jest.fn().mockResolvedValue(undefined),
    onDeleteFile: jest.fn().mockResolvedValue(undefined),
    onDownloadFile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FilesTab', () => {
  it('shows empty state when no files are uploaded', () => {
    render(<FilesTab {...buildProps()} />);
    expect(screen.getByText(/No files uploaded yet/i)).toBeInTheDocument();
  });

  it('renders a row for each file', () => {
    const files = [makeFile({ id: 'f1', fileName: 'a.pdf' }), makeFile({ id: 'f2', fileName: 'b.pptx' })];
    render(<FilesTab {...buildProps({ files })} />);
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pptx')).toBeInTheDocument();
  });

  it('shows "Upload File (PDF/PPTX)" button when not uploading', () => {
    render(<FilesTab {...buildProps()} />);
    expect(screen.getByText('Upload File (PDF/PPTX)')).toBeInTheDocument();
  });

  it('shows "Uploading…" and disables button when isUploading=true', () => {
    render(<FilesTab {...buildProps({ isUploading: true })} />);
    const btn = screen.getByText('Uploading\u2026');
    expect(btn).toBeDisabled();
  });

  // ── formatSize ───────────────────────────────────────────────────────────

  it('formats size in KB when below 1 MB', () => {
    const files = [makeFile({ fileSizeBytes: 512000 })]; // 500 KB
    render(<FilesTab {...buildProps({ files })} />);
    expect(screen.getByText('500 KB')).toBeInTheDocument();
  });

  it('formats size in MB when 1 MB or above', () => {
    const files = [makeFile({ fileSizeBytes: 2 * 1024 * 1024 })]; // 2 MB
    render(<FilesTab {...buildProps({ files })} />);
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });

  // ── getStatusBadge ────────────────────────────────────────────────────────

  it('shows "Ready" badge for status=ready', () => {
    const files = [makeFile({ status: 'ready' })];
    render(<FilesTab {...buildProps({ files })} />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows "Processing" badge for status=processing', () => {
    const files = [makeFile({ status: 'processing' })];
    render(<FilesTab {...buildProps({ files })} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('shows "Processing" badge for status=uploading', () => {
    const files = [makeFile({ status: 'uploading' })];
    render(<FilesTab {...buildProps({ files })} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('shows "Failed" badge for status=failed', () => {
    const files = [makeFile({ status: 'failed' })];
    render(<FilesTab {...buildProps({ files })} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  // ── Delete button ─────────────────────────────────────────────────────────

  it('calls onDeleteFile with the file id when delete is clicked', async () => {
    const onDeleteFile = jest.fn().mockResolvedValue(undefined);
    const files = [makeFile({ id: 'f1' })];
    render(<FilesTab {...buildProps({ files, onDeleteFile })} />);
    await act(async () => { fireEvent.click(screen.getByTitle('Delete file')); });
    expect(onDeleteFile).toHaveBeenCalledWith('f1');
  });

  it('applies error styles on delete button mouseEnter and resets on mouseLeave', () => {
    const files = [makeFile()];
    render(<FilesTab {...buildProps({ files })} />);
    const deleteBtn = screen.getByTitle('Delete file');
    fireEvent.mouseEnter(deleteBtn);
    expect(deleteBtn.style.background).toBe('var(--color-error-alpha-08)');
    fireEvent.mouseLeave(deleteBtn);
    expect(deleteBtn.style.background).toBe('transparent');
  });

  // ── handleFileChange ──────────────────────────────────────────────────────

  it('calls onUploadFile when a file is selected via the hidden input', async () => {
    const onUploadFile = jest.fn().mockResolvedValue(undefined);
    render(<FilesTab {...buildProps({ onUploadFile })} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(onUploadFile).toHaveBeenCalledWith(file);
  });

  it('shows upload error when onUploadFile throws', async () => {
    const onUploadFile = jest.fn().mockRejectedValue(new Error('Server error'));
    render(<FilesTab {...buildProps({ onUploadFile })} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('shows generic "Upload failed" when a non-Error is thrown', async () => {
    const onUploadFile = jest.fn().mockRejectedValue('something went wrong');
    render(<FilesTab {...buildProps({ onUploadFile })} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('does nothing when no file is selected (e.target.files is empty)', async () => {
    const onUploadFile = jest.fn();
    render(<FilesTab {...buildProps({ onUploadFile })} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } });
    });
    expect(onUploadFile).not.toHaveBeenCalled();
  });

  // ── Double-click download ─────────────────────────────────────────────────

  it('calls onDownloadFile with the file id when a ready file is double-clicked', async () => {
    const onDownloadFile = jest.fn().mockResolvedValue(undefined);
    const files = [makeFile({ id: 'f1', status: 'ready' })];
    render(<FilesTab {...buildProps({ files, onDownloadFile })} />);
    await act(async () => { fireEvent.doubleClick(screen.getByTitle('Double-click to download')); });
    expect(onDownloadFile).toHaveBeenCalledWith('f1');
  });

  it('does not call onDownloadFile when a non-ready file is double-clicked', async () => {
    const onDownloadFile = jest.fn();
    const files = [makeFile({ id: 'f1', status: 'processing' })];
    render(<FilesTab {...buildProps({ files, onDownloadFile })} />);
    await act(async () => { fireEvent.doubleClick(screen.getByText('lecture.pdf').closest('div')!); });
    expect(onDownloadFile).not.toHaveBeenCalled();
  });

  it('upload button click triggers the hidden file input', () => {
    render(<FilesTab {...buildProps()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click');
    fireEvent.click(screen.getByText('Upload File (PDF/PPTX)'));
    expect(clickSpy).toHaveBeenCalled();
  });
});

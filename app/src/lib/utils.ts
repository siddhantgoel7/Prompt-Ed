// Shared utility functions used across the app for class merging, time formatting, and text truncation.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merges Tailwind class names, resolving conflicts with tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a timestamp as a time string if within 24h, or a short date string otherwise. */
export function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Truncates text to maxLength characters and appends ellipsis if needed. */
export function truncateText(text: string, maxLength: number = 80) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

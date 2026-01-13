import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function generateFilename(pattern: string, index: number, content: string): string {
  const ext = pattern.endsWith('.png') || pattern.endsWith('.jpg') 
    ? pattern 
    : `${pattern}.png`;
  
  return ext
    .replace('{index}', String(index).padStart(3, '0'))
    .replace('{content}', content.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_'))
    .replace('{timestamp}', Date.now().toString());
}

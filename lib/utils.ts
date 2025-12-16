import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | { seconds: number } | { toDate: () => Date } | undefined | null): string {
  if (!date) return '-';
  
  let d: Date;
  try {
    if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      d = date.toDate();
    } else if (date && typeof date === 'object' && 'seconds' in date) {
      d = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      d = date;
    } else {
      return '-';
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}:${month}:${year}`;
  } catch {
    return '-';
  }
}

export function formatDateTime(date: Date | { seconds: number } | { toDate: () => Date } | undefined | null): string {
  if (!date) return '-';
  
  let d: Date;
  try {
    if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      d = date.toDate();
    } else if (date && typeof date === 'object' && 'seconds' in date) {
      d = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      d = date;
    } else {
      return '-';
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}:${month}:${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

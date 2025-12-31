// Utility functions for date filtering across Accounts module

export function toDate(ts?: any): Date | null {
  try {
    if (!ts) return null;
    if ('toDate' in ts && typeof ts.toDate === 'function') return ts.toDate();
    if (typeof (ts as any).seconds === 'number') return new Date((ts as any).seconds * 1000);
  } catch (e) {
    // ignore
  }
  return null;
}

export function isDateInRange(date: Date | null, rangeStart: Date, rangeEnd: Date): boolean {
  if (!date) return false;
  return date >= rangeStart && date <= rangeEnd;
}

export function filterByDateRange(
  items: any[],
  dateField: string,
  rangeStart: Date,
  rangeEnd: Date
): any[] {
  return items.filter((item) => {
    const itemDate = toDate(item[dateField]);
    return isDateInRange(itemDate, rangeStart, rangeEnd);
  });
}

export function formatDateOnly(date: Date | null | undefined): string {
  if (!date) return '-';
  const d = date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime12(ts?: any): string {
  const d = ts instanceof Date ? ts : toDate(ts);
  if (!d) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${minutes} ${period}`;
}

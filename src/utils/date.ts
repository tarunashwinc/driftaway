export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] as string;
}

export function parseDate(str: string): Date {
  return new Date(str);
}

export function getDaysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isExpired(date: Date): boolean {
  return date < new Date();
}

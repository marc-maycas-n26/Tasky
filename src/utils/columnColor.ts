import type { Column } from '../types';

export function getColumnColor(column: Column): string {
  if (column.color) return column.color;
  if (column.isBacklog) return '#9CA3AF';
  if (column.isTodo) return '#6366F1';
  const lower = column.name.toLowerCase();
  if (lower === 'done') return '#10B981';
  if (lower.includes('review')) return '#8B5CF6';
  if (lower.includes('progress')) return '#F59E0B';
  return '#6366F1';
}

import type { Column } from '../types';

const NAME_COLORS: Record<string, string> = {
  'backlog':         '#A0AEC0',
  'to do':           '#667EEA',
  'in progress':     '#ED8936',
  'discovery':       '#00BCD4',
  'development':     '#3182CE',
  'experimentation': '#9F7AEA',
  'review':          '#B83280',
  'blocked':         '#E53E3E',
  'done':            '#38A169',
  "won't do":        '#718096',
};

export function getColumnColor(column: Column): string {
  if (column.color) return column.color;
  const lower = column.name.toLowerCase();
  if (NAME_COLORS[lower]) return NAME_COLORS[lower];
  if (column.isBacklog) return '#A0AEC0';
  if (column.role === 'todo' || column.isTodo) return '#667EEA';
  if (column.role === 'in_progress') return '#ED8936';
  if (column.role === 'done') return '#38A169';
  if (lower.includes('block')) return '#E53E3E';
  if (lower.includes('review')) return '#B83280';
  if (lower.includes('progress')) return '#ED8936';
  return '#667EEA';
}

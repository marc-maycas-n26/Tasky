import type { Priority } from '../types';

export const PRIORITIES: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest'];

export const PRIORITY_COLORS: Record<Priority, string> = {
  highest: '#DE350B',
  high:    '#FF5630',
  medium:  '#FF8B00',
  low:     '#0052CC',
  lowest:  '#8993A4',
};

export const PRIORITY_ICONS: Record<Priority, string> = {
  highest: '↑↑',
  high:    '↑',
  medium:  '→',
  low:     '↓',
  lowest:  '↓↓',
};

/** Four filled dots whose colors encode priority level (●●●●) */
export const PRIORITY_DOT_COLORS: Record<Priority, string[]> = {
  highest: ['#DE350B', '#DE350B', '#DE350B', '#DE350B'],
  high:    ['#FF5630', '#FF5630', '#FF5630', '#8993A4'],
  medium:  ['#FF8B00', '#FF8B00', '#8993A4', '#8993A4'],
  low:     ['#0052CC', '#8993A4', '#8993A4', '#8993A4'],
  lowest:  ['#8993A4', '#8993A4', '#8993A4', '#8993A4'],
};

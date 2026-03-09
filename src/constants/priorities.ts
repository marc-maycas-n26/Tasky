import type { Priority } from '../types';

export const PRIORITIES: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest'];

export const PRIORITY_COLORS: Record<Priority, string> = {
  highest: '#E63946',
  high:    '#F4845F',
  medium:  '#F4C430',
  low:     '#4ECDC4',
  lowest:  '#8993A4',
};

export const PRIORITY_ICONS: Record<Priority, string> = {
  highest: '↑↑',
  high:    '↑',
  medium:  '→',
  low:     '↓',
  lowest:  '↓↓',
};

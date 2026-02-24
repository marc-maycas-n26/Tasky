import { v4 as uuidv4 } from 'uuid';
import type { AppState } from '../types';

const now = new Date().toISOString();

const col1 = uuidv4();
const col2 = uuidv4();
const col3 = uuidv4();
const col4 = uuidv4();

const epic1 = uuidv4();

const tag1 = uuidv4();
const tag2 = uuidv4();
const tag3 = uuidv4();

const tmpl1 = uuidv4();

const t1 = uuidv4();
const t2 = uuidv4();
const t3 = uuidv4();
const t4 = uuidv4();

export const SEED_DATA: AppState = {
  schemaVersion: 1,
  nextTicketNumber: 5,
  settings: {
    projectKey: 'TM',
    googleDrive: { connected: false, autoSync: false },
  },
  columns: [
    { id: col1, name: 'Backlog', order: 0, isBacklog: true, isTodo: false, createdAt: now, updatedAt: now },
    { id: col2, name: 'To Do', order: 1, isBacklog: false, isTodo: true, createdAt: now, updatedAt: now },
    { id: col3, name: 'In Progress', order: 2, isBacklog: false, isTodo: false, createdAt: now, updatedAt: now },
    { id: col4, name: 'Done', order: 3, isBacklog: false, isTodo: false, createdAt: now, updatedAt: now },
  ],
  epics: [
    {
      id: epic1,
      title: 'Initial Setup',
      description: 'Bootstrap the project and tooling',
      color: '#6554C0',
      order: 0,
      isCollapsed: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
  tags: [
    { id: tag1, name: 'frontend', color: '#0052CC', createdAt: now, updatedAt: now },
    { id: tag2, name: 'backend', color: '#00875A', createdAt: now, updatedAt: now },
    { id: tag3, name: 'bug', color: '#DE350B', createdAt: now, updatedAt: now },
  ],
  templates: [
    {
      id: tmpl1,
      name: 'Bug Report',
      defaultFields: {
        title: '[Bug] ',
        description: '**Steps to reproduce:**\n1. \n2. \n\n**Expected:**\n\n**Actual:**\n',
        priority: 'high',
        tagIds: [tag3],
      },
      defaultSubtasks: [
        { title: 'Reproduce bug', tags: [] },
        { title: 'Write fix', tags: [] },
        { title: 'Add regression test', tags: [] },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ],
  tickets: [
    {
      id: t1,
      key: 'TM-1',
      title: 'Set up project repository',
      description: 'Initialize git repo, add README and .gitignore.',
      columnId: col4,
      epicId: epic1,
      tagIds: [tag1],
      order: 0,
      priority: 'medium',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: t2,
      key: 'TM-2',
      title: 'Configure CI pipeline',
      description: 'Add GitHub Actions workflow for lint + test.',
      columnId: col3,
      epicId: epic1,
      tagIds: [],
      order: 0,
      priority: 'medium',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: t3,
      key: 'TM-3',
      title: 'Design system tokens',
      description: 'Define color, spacing, and typography design tokens.',
      columnId: col2,
      epicId: epic1,
      tagIds: [tag1],
      order: 0,
      priority: 'low',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: t4,
      key: 'TM-4',
      title: 'Explore authentication options',
      description: 'Compare OAuth providers for optional login feature.',
      columnId: col1,
      tagIds: [],
      order: 0,
      priority: 'low',
      createdAt: now,
      updatedAt: now,
    },
  ],
  trashedTickets: [],
  automationRules: [],
  comments: [],
  linkedItems: [],
};

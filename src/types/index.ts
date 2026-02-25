// ─── Core entity types ────────────────────────────────────────────────────────

export type Priority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';

export type EpicStatus = 'todo' | 'inprogress' | 'done';

export interface Column {
  id: string;
  name: string;
  order: number;
  isBacklog: boolean;
  isTodo: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Epic {
  id: string;
  title: string;
  description?: string;
  color?: string;
  status?: EpicStatus;
  tagIds: string[];
  order: number;
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubtaskTemplate {
  title: string;
  tags?: string[];
}

export interface Template {
  id: string;
  name: string;
  defaultFields: Partial<Pick<Ticket, 'title' | 'description' | 'epicId' | 'priority' | 'dueDate'>> & { tagIds?: string[] };
  defaultSubtasks: SubtaskTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  key: string; // e.g. "TM-1"
  title: string;
  description: string;
  columnId: string;
  inBacklog: boolean; // true = lives in backlog; false = on the board
  epicId?: string;
  tagIds: string[];
  parentId?: string;
  order: number; // within (columnId + epicId/null + parentId/null)
  priority?: Priority;
  dueDate?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type LinkedItemRelation = 'clones' | 'is cloned by' | 'relates to' | 'blocks' | 'is blocked by';

export interface LinkedItem {
  id: string;
  ticketId: string;           // the ticket this link belongs to
  targetKey: string;          // e.g. "TM-5"
  targetTitle: string;
  relation: LinkedItemRelation;
  createdAt: string;
}

export type AutomationTrigger = 'onTicketCreate' | 'onMoveToColumn';

export interface AutomationAction {
  type: 'createSubtasksFromTemplate';
  templateId: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: Record<string, unknown>;
  actions: AutomationAction[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Trash ────────────────────────────────────────────────────────────────────

export interface TrashedTicket {
  ticket: Ticket;
  /** ISO timestamp when the ticket was moved to trash */
  trashedAt: string;
  /** ISO timestamp when the ticket will be auto-purged (trashedAt + 30 days) */
  expiresAt: string;
}

// ─── App state snapshot (used for export/import and cloud sync) ───────────────

export interface AppState {
  schemaVersion: number;
  columns: Column[];
  epics: Epic[];
  tags: Tag[];
  tickets: Ticket[];
  trashedTickets: TrashedTicket[];
  templates: Template[];
  automationRules: AutomationRule[];
  comments: Comment[];
  linkedItems: LinkedItem[];
  nextTicketNumber: number;
  settings: AppSettings;
  exportedAt?: string;
}

export interface AppSettings {
  projectKey: string; // e.g. "TM"
  markdownFolder?: {
    folderName: string; // display name of the picked folder
  };
}

// ─── Storage adapter interface ────────────────────────────────────────────────

export interface StorageAdapter {
  name: string;
  supportsSync: boolean;
  loadAll(): Promise<AppState>;
  saveAll(state: AppState): Promise<void>;
}

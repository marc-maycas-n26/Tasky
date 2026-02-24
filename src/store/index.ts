import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  AppState, AppSettings, Column, Epic, Tag, Template, Ticket, TrashedTicket, StorageAdapter,
  Comment, LinkedItem, LinkedItemRelation,
} from '../types';
import { IndexedDbAdapter } from '../storage/indexedDb';
import { MarkdownFsAdapter, restoreDirectoryHandle } from '../storage/markdownFs';

interface StoreState extends AppState {
  // adapter
  adapter: StorageAdapter;
  isLoading: boolean;
  isSaving: boolean;
  lastError: string | null;
  selectedTicketId: string | null;
  isTicketDrawerOpen: boolean;
  isCreateTicketOpen: boolean;
  createTicketDefaults: Partial<Ticket>;
  selectedEpicId: string | null;
  isEpicDrawerOpen: boolean;

  // lifecycle
  init(): Promise<void>;
  persist(): Promise<void>;
  importState(state: AppState): Promise<void>;
  exportState(): AppState;
  setAdapter(adapter: StorageAdapter): void;

  // columns
  addColumn(name: string): void;
  updateColumn(id: string, patch: Partial<Column>): void;
  deleteColumn(id: string): void;
  reorderColumns(ids: string[]): void;

  // epics
  addEpic(fields: Partial<Epic> & { title: string }): void;
  updateEpic(id: string, patch: Partial<Epic>): void;
  deleteEpic(id: string): void;
  toggleEpicCollapsed(id: string): void;
  reorderEpics(ids: string[]): void;

  // tags
  addTag(name: string, color: string): void;
  updateTag(id: string, patch: Partial<Tag>): void;
  deleteTag(id: string): void;

  // templates
  addTemplate(fields: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): void;
  updateTemplate(id: string, patch: Partial<Template>): void;
  deleteTemplate(id: string): void;

  // tickets
  addTicket(fields: Partial<Ticket> & { title: string; columnId: string }): Ticket;
  updateTicket(id: string, patch: Partial<Ticket>): void;
  deleteTicket(id: string): void;
  trashTicket(id: string): void;
  restoreTicket(id: string): void;
  purgeTicket(id: string): void;
  purgeExpiredTrash(): void;
  moveTicket(ticketId: string, targetColumnId: string, targetEpicId: string | undefined, newOrder: number): void;
  reorderTickets(columnId: string, epicId: string | undefined, orderedIds: string[]): void;

  // comments
  addComment(ticketId: string, body: string): void;
  deleteComment(id: string): void;

  // linked items
  addLinkedItem(ticketId: string, targetKey: string, targetTitle: string, relation: LinkedItemRelation): void;
  deleteLinkedItem(id: string): void;

  // ui helpers
  openTicket(id: string): void;
  closeTicket(): void;
  openCreateTicket(defaults?: Partial<Ticket>): void;
  closeCreateTicket(): void;
  openEpic(id: string): void;
  closeEpic(): void;

  // settings
  updateSettings(patch: Partial<AppSettings>): void;
}

const now = () => new Date().toISOString();

export const useStore = create<StoreState>((set, get) => ({
  // ── initial state ──────────────────────────────────────────────────────────
  // IndexedDbAdapter is instantiated lazily inside init() — avoids opening
  // the database on module load when markdown-folder mode may take over.
  adapter: new IndexedDbAdapter(),
  isLoading: false,
  isSaving: false,
  lastError: null,
  selectedTicketId: null,
  isTicketDrawerOpen: false,
  isCreateTicketOpen: false,
  createTicketDefaults: {},
  selectedEpicId: null,
  isEpicDrawerOpen: false,
  schemaVersion: 1,
  nextTicketNumber: 1,
  columns: [],
  epics: [],
  tags: [],
  tickets: [],
  trashedTickets: [],
  templates: [],
  automationRules: [],
  comments: [],
  linkedItems: [],
  settings: { projectKey: 'TM' },

  // ── lifecycle ──────────────────────────────────────────────────────────────
  async init() {
    set({ isLoading: true, lastError: null });
    try {
      // Always attempt to restore the markdown folder handle first.
      // This ensures IndexedDB is never read when markdown mode was configured.
      let adapter = get().adapter;
      if (!(adapter instanceof MarkdownFsAdapter)) {
        const handle = await restoreDirectoryHandle();
        if (handle) {
          adapter = new MarkdownFsAdapter(handle);
          set({ adapter });
        }
        // If no handle was found, adapter remains IndexedDbAdapter — that is fine.
      }
      const state = await adapter.loadAll();
      const trashedTickets = state.trashedTickets ?? [];
      set({ ...state, trashedTickets, isLoading: false });
      get().purgeExpiredTrash();
    } catch (e) {
      set({ isLoading: false, lastError: String(e) });
    }
  },

  async persist() {
    const s = get();
    set({ isSaving: true });
    try {
      const snapshot: AppState = {
        schemaVersion: s.schemaVersion,
        columns: s.columns,
        epics: s.epics,
        tags: s.tags,
        tickets: s.tickets,
        trashedTickets: s.trashedTickets,
        templates: s.templates,
        automationRules: s.automationRules,
        comments: s.comments,
        linkedItems: s.linkedItems,
        nextTicketNumber: s.nextTicketNumber,
        settings: s.settings,
      };
      await s.adapter.saveAll(snapshot);
      set({ isSaving: false });
    } catch (e) {
      set({ isSaving: false, lastError: String(e) });
    }
  },

  async importState(state: AppState) {
    set({ ...state });
    await get().persist();
  },

  exportState() {
    const s = get();
    return {
      schemaVersion: s.schemaVersion,
      columns: s.columns,
      epics: s.epics,
      tags: s.tags,
      tickets: s.tickets,
      trashedTickets: s.trashedTickets,
      templates: s.templates,
      automationRules: s.automationRules,
      comments: s.comments,
      linkedItems: s.linkedItems,
      nextTicketNumber: s.nextTicketNumber,
      settings: s.settings,
      exportedAt: now(),
    };
  },

  setAdapter(adapter) {
    set({ adapter });
  },

  // ── columns ────────────────────────────────────────────────────────────────
  addColumn(name) {
    const cols = get().columns;
    const col: Column = {
      id: uuidv4(), name, order: cols.length,
      isBacklog: false, isTodo: false,
      createdAt: now(), updatedAt: now(),
    };
    set({ columns: [...cols, col] });
    get().persist();
  },

  updateColumn(id, patch) {
    set(s => ({
      columns: s.columns.map(c => c.id === id ? { ...c, ...patch, updatedAt: now() } : c),
    }));
    get().persist();
  },

  deleteColumn(id) {
    set(s => ({
      columns: s.columns.filter(c => c.id !== id),
      tickets: s.tickets.filter(t => t.columnId !== id),
    }));
    get().persist();
  },

  reorderColumns(ids) {
    set(s => ({
      columns: ids.map((id, i) => {
        const col = s.columns.find(c => c.id === id)!;
        return { ...col, order: i, updatedAt: now() };
      }),
    }));
    get().persist();
  },

  // ── epics ──────────────────────────────────────────────────────────────────
  addEpic(fields) {
    const epics = get().epics;
    const epic: Epic = {
      id: uuidv4(), title: fields.title,
      description: fields.description,
      color: fields.color ?? '#6554C0',
      tagIds: fields.tagIds ?? [],
      order: epics.length,
      isCollapsed: false,
      createdAt: now(), updatedAt: now(),
    };
    set({ epics: [...epics, epic] });
    get().persist();
  },

  updateEpic(id, patch) {
    set(s => ({
      epics: s.epics.map(e => e.id === id ? { ...e, ...patch, updatedAt: now() } : e),
    }));
    get().persist();
  },

  deleteEpic(id) {
    set(s => ({
      epics: s.epics.filter(e => e.id !== id),
      tickets: s.tickets.map(t => t.epicId === id ? { ...t, epicId: undefined, updatedAt: now() } : t),
    }));
    get().persist();
  },

  toggleEpicCollapsed(id) {
    set(s => ({
      epics: s.epics.map(e => e.id === id ? { ...e, isCollapsed: !e.isCollapsed, updatedAt: now() } : e),
    }));
    get().persist();
  },

  reorderEpics(ids) {
    set(s => ({
      epics: ids.map((id, i) => {
        const e = s.epics.find(x => x.id === id)!;
        return { ...e, order: i, updatedAt: now() };
      }),
    }));
    get().persist();
  },

  // ── tags ───────────────────────────────────────────────────────────────────
  addTag(name, color) {
    const tag: Tag = { id: uuidv4(), name, color, createdAt: now(), updatedAt: now() };
    set(s => ({ tags: [...s.tags, tag] }));
    get().persist();
  },

  updateTag(id, patch) {
    set(s => ({
      tags: s.tags.map(t => t.id === id ? { ...t, ...patch, updatedAt: now() } : t),
    }));
    get().persist();
  },

  deleteTag(id) {
    set(s => ({
      tags: s.tags.filter(t => t.id !== id),
      tickets: s.tickets.map(t => ({
        ...t,
        tagIds: t.tagIds.filter(tid => tid !== id),
      })),
    }));
    get().persist();
  },

  // ── templates ──────────────────────────────────────────────────────────────
  addTemplate(fields) {
    const tmpl: Template = { id: uuidv4(), ...fields, createdAt: now(), updatedAt: now() };
    set(s => ({ templates: [...s.templates, tmpl] }));
    get().persist();
  },

  updateTemplate(id, patch) {
    set(s => ({
      templates: s.templates.map(t => t.id === id ? { ...t, ...patch, updatedAt: now() } : t),
    }));
    get().persist();
  },

  deleteTemplate(id) {
    set(s => ({ templates: s.templates.filter(t => t.id !== id) }));
    get().persist();
  },

  // ── tickets ────────────────────────────────────────────────────────────────
  addTicket(fields) {
    const s = get();
    const num = s.nextTicketNumber;
    const ticket: Ticket = {
      id: uuidv4(),
      key: `${s.settings.projectKey}-${num}`,
      title: fields.title,
      description: fields.description ?? '',
      columnId: fields.columnId,
      epicId: fields.epicId,
      tagIds: fields.tagIds ?? [],
      parentId: fields.parentId,
      order: fields.order ?? s.tickets.filter(
        t => t.columnId === fields.columnId && t.epicId === fields.epicId && !t.parentId
      ).length,
      priority: fields.priority,
      estimate: fields.estimate,
      dueDate: fields.dueDate,
      createdAt: now(),
      updatedAt: now(),
    };
    set(st => ({
      tickets: [...st.tickets, ticket],
      nextTicketNumber: num + 1,
    }));
    get().persist();
    return ticket;
  },

  updateTicket(id, patch) {
    set(s => ({
      tickets: s.tickets.map(t => t.id === id ? { ...t, ...patch, updatedAt: now() } : t),
    }));
    get().persist();
  },

  deleteTicket(id) {
    // Hard delete — kept for internal use (e.g. purge). UI should use trashTicket.
    set(s => ({
      tickets: s.tickets.filter(t => t.id !== id && t.parentId !== id),
      trashedTickets: s.trashedTickets.filter(tr => tr.ticket.id !== id),
    }));
    get().persist();
  },

  trashTicket(id) {
    const s = get();
    const trashedAt = now();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    // Collect ticket and its subtasks
    const toTrash = s.tickets.filter(t => t.id === id || t.parentId === id);
    const newTrashed: TrashedTicket[] = toTrash.map(t => ({ ticket: t, trashedAt, expiresAt }));
    set(st => ({
      tickets: st.tickets.filter(t => t.id !== id && t.parentId !== id),
      trashedTickets: [...st.trashedTickets, ...newTrashed],
    }));
    get().persist();
  },

  restoreTicket(id) {
    const s = get();
    const entry = s.trashedTickets.find(tr => tr.ticket.id === id);
    if (!entry) return;
    // Restore the ticket and any subtasks that were trashed at the same time
    const sameBatch = s.trashedTickets.filter(
      tr => tr.ticket.id === id || (tr.ticket.parentId === id && tr.trashedAt === entry.trashedAt)
    );
    set(st => ({
      tickets: [...st.tickets, ...sameBatch.map(tr => tr.ticket)],
      trashedTickets: st.trashedTickets.filter(tr => !sameBatch.some(b => b.ticket.id === tr.ticket.id)),
    }));
    get().persist();
  },

  purgeTicket(id) {
    set(s => ({
      trashedTickets: s.trashedTickets.filter(
        tr => tr.ticket.id !== id && tr.ticket.parentId !== id
      ),
    }));
    get().persist();
  },

  purgeExpiredTrash() {
    const cutoff = new Date().toISOString();
    set(s => ({
      trashedTickets: s.trashedTickets.filter(tr => tr.expiresAt > cutoff),
    }));
    get().persist();
  },

  moveTicket(ticketId, targetColumnId, targetEpicId, newOrder) {
    set(s => ({
      tickets: s.tickets.map(t =>
        t.id === ticketId
          ? { ...t, columnId: targetColumnId, epicId: targetEpicId, order: newOrder, updatedAt: now() }
          : t
      ),
    }));
    get().persist();
  },

  reorderTickets(_columnId, _epicId, orderedIds) {
    set(s => ({
      tickets: s.tickets.map(t => {
        const idx = orderedIds.indexOf(t.id);
        if (idx === -1) return t;
        return { ...t, order: idx, updatedAt: now() };
      }),
    }));
    get().persist();
  },

  // ── comments ───────────────────────────────────────────────────────────────
  addComment(ticketId, body) {
    const comment: Comment = { id: uuidv4(), ticketId, body, createdAt: now(), updatedAt: now() };
    set(s => ({ comments: [...s.comments, comment] }));
    get().persist();
  },

  deleteComment(id) {
    set(s => ({ comments: s.comments.filter(c => c.id !== id) }));
    get().persist();
  },

  // ── linked items ───────────────────────────────────────────────────────────
  addLinkedItem(ticketId, targetKey, targetTitle, relation) {
    const item: LinkedItem = { id: uuidv4(), ticketId, targetKey, targetTitle, relation, createdAt: now() };
    set(s => ({ linkedItems: [...s.linkedItems, item] }));
    get().persist();
  },

  deleteLinkedItem(id) {
    set(s => ({ linkedItems: s.linkedItems.filter(l => l.id !== id) }));
    get().persist();
  },

  // ── ui ─────────────────────────────────────────────────────────────────────
  openTicket(id) {
    set({ selectedTicketId: id, isTicketDrawerOpen: true });
  },
  closeTicket() {
    set({ isTicketDrawerOpen: false, selectedTicketId: null });
  },
  openCreateTicket(defaults = {}) {
    set({ isCreateTicketOpen: true, createTicketDefaults: defaults });
  },
  closeCreateTicket() {
    set({ isCreateTicketOpen: false, createTicketDefaults: {} });
  },
  openEpic(id) {
    set({ selectedEpicId: id, isEpicDrawerOpen: true });
  },
  closeEpic() {
    set({ isEpicDrawerOpen: false, selectedEpicId: null });
  },

  // ── settings ───────────────────────────────────────────────────────────────
  updateSettings(patch) {
    set(s => ({ settings: { ...s.settings, ...patch } }));
    get().persist();
  },
}));

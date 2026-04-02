import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  AppState, AppSettings, Column, Epic, Tag, Template, Ticket, TrashedTicket, ReleasedEpic, StorageAdapter,
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
  releaseEpic(id: string): void;
  releaseDoneTickets(): void;
  restoreTicketFromRelease(ticketId: string): void;
  deleteReleases(epicIds: string[]): void;

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
  moveToBoard(ticketId: string, targetColumnId: string): void;
  moveToBacklog(ticketId: string): void;
  reorderTickets(columnId: string, epicId: string | undefined, orderedIds: string[]): void;

  // comments
  addComment(ticketId: string, body: string): void;
  updateComment(id: string, body: string): void;
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
  releasedEpics: [],
  templates: [],
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
      const releasedEpics = state.releasedEpics ?? [];
      set({ ...state, trashedTickets, releasedEpics, isLoading: false });

      // Migrate: force-assign canonical colors to known column names
      {
        const CANONICAL_COLORS: Record<string, string> = {
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
        const patchedColumns = (state.columns ?? []).map(c => {
          const key = c.name.toLowerCase();
          if (CANONICAL_COLORS[key]) return { ...c, color: CANONICAL_COLORS[key] };
          if (!c.color) {
            const color = c.isBacklog ? '#A0AEC0'
              : c.role === 'todo' ? '#667EEA'
              : c.role === 'in_progress' ? '#ED8936'
              : c.role === 'done' ? '#38A169'
              : '#667EEA';
            return { ...c, color };
          }
          return c;
        });
        set({ columns: patchedColumns });
        get().persist();
      }

      // Seed default columns on a clean state (no columns stored yet)
      if ((state.columns ?? []).length === 0) {
        const ts = now();
        const backlogCol: Column = { id: uuidv4(), name: 'Backlog', order: 0, isBacklog: true, isTodo: false, createdAt: ts, updatedAt: ts };
        const todoCol: Column = { id: uuidv4(), name: 'To Do', order: 1, isBacklog: false, isTodo: true, role: 'todo', createdAt: ts, updatedAt: ts };
        const inProgressCol: Column = { id: uuidv4(), name: 'In Progress', order: 2, isBacklog: false, isTodo: false, role: 'in_progress', createdAt: ts, updatedAt: ts };
        const doneCol: Column = { id: uuidv4(), name: 'Done', order: 3, isBacklog: false, isTodo: false, role: 'done', createdAt: ts, updatedAt: ts };
        set({ columns: [backlogCol, todoCol, inProgressCol, doneCol] });
        get().persist();
      }

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
        releasedEpics: s.releasedEpics,
        templates: s.templates,
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
      releasedEpics: s.releasedEpics,
      templates: s.templates,
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

  releaseEpic(id) {
    const s = get();
    const epic = s.epics.find(e => e.id === id);
    if (!epic) return;
    const epicTickets = s.tickets.filter(t => t.epicId === id);
    const released: ReleasedEpic = {
      epic: { ...epic },
      tickets: epicTickets.map(t => ({ ...t })),
      releasedAt: now(),
    };
    set(st => ({
      releasedEpics: [...st.releasedEpics, released],
      // Remove the epic from the active list
      epics: st.epics.filter(e => e.id !== id),
      // Detach all tickets that belonged to the epic (keep tickets but unlink from epic)
      tickets: st.tickets.filter(t => t.epicId !== id),
    }));
    get().persist();
  },

  releaseDoneTickets() {
    const s = get();
    const doneColIds = new Set(
      s.columns
        .filter(c => c.role === 'done' || c.name.toLowerCase() === 'done')
        .map(c => c.id)
    );
    const doneTickets = s.tickets.filter(t => !t.inBacklog && doneColIds.has(t.columnId));
    if (doneTickets.length === 0) return;

    // Group done tickets by epicId (undefined = no epic)
    const byEpic = new Map<string | undefined, typeof doneTickets>();
    for (const t of doneTickets) {
      const key = t.epicId ?? undefined;
      if (!byEpic.has(key)) byEpic.set(key, []);
      byEpic.get(key)!.push(t);
    }

    const releasedAt = now();
    const newReleases: import('../types').ReleasedEpic[] = [];
    const epicIdsToRelease = new Set<string>();
    const ticketIdsToRemove = new Set<string>(doneTickets.map(t => t.id));

    for (const [epicId, tickets] of byEpic) {
      const epic = epicId ? s.epics.find(e => e.id === epicId) : undefined;
      newReleases.push({
        epic: epic ? { ...epic } : {
          id: `unassigned-${releasedAt}`,
          title: 'Unassigned',
          color: '#97A0AF',
          order: 0,
          isCollapsed: false,
          createdAt: releasedAt,
          updatedAt: releasedAt,
        },
        tickets: tickets.map(t => ({ ...t })),
        releasedAt,
      });

      if (epicId) {
        // Only fully release the epic if ALL its tickets are done
        const allEpicTickets = s.tickets.filter(t => t.epicId === epicId);
        if (allEpicTickets.every(t => ticketIdsToRemove.has(t.id))) {
          epicIdsToRelease.add(epicId);
        }
      }
    }

    set(st => ({
      releasedEpics: [...st.releasedEpics, ...newReleases],
      epics: st.epics.filter(e => !epicIdsToRelease.has(e.id)),
      tickets: st.tickets.filter(t => !ticketIdsToRemove.has(t.id)),
    }));
    get().persist();
  },

  restoreTicketFromRelease(ticketId) {
    const s = get();
    // Find which ReleasedEpic contains this ticket
    const releaseIdx = s.releasedEpics.findIndex(r => r.tickets.some(t => t.id === ticketId));
    if (releaseIdx === -1) return;
    const release = s.releasedEpics[releaseIdx];
    const ticket = release.tickets.find(t => t.id === ticketId)!;

    // Find a 'todo' column to restore into, fall back to the first non-backlog column
    const todoCol = s.columns.find(c => c.role === 'todo' && !c.isBacklog)
      ?? s.columns.filter(c => !c.isBacklog).sort((a, b) => a.order - b.order)[0];
    if (!todoCol) return;

    const maxOrder = Math.max(0, ...s.tickets.filter(t => t.columnId === todoCol.id).map(t => t.order));
    const restoredTicket = { ...ticket, columnId: todoCol.id, inBacklog: false, order: maxOrder + 1 };

    // Remove from the release; if no tickets remain, remove the whole release entry
    const updatedTickets = release.tickets.filter(t => t.id !== ticketId);
    const updatedReleases = updatedTickets.length > 0
      ? s.releasedEpics.map((r, i) => i === releaseIdx ? { ...r, tickets: updatedTickets } : r)
      : s.releasedEpics.filter((_, i) => i !== releaseIdx);

    set({ tickets: [...s.tickets, restoredTicket], releasedEpics: updatedReleases });
    get().persist();
  },

  deleteReleases(epicIds) {
    const s = get();
    const epicIdSet = new Set(epicIds);
    const removedReleases = s.releasedEpics.filter(r => epicIdSet.has(r.epic.id));
    const removedTicketIds = new Set(removedReleases.flatMap(r => r.tickets.map(t => t.id)));
    set({
      releasedEpics: s.releasedEpics.filter(r => !epicIdSet.has(r.epic.id)),
      comments: s.comments.filter(c => !removedTicketIds.has(c.ticketId)),
    });
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
    const inBacklog = fields.inBacklog ?? false;
    // For backlog tickets, columnId is not meaningful yet — use empty string as placeholder
    const columnId = inBacklog ? (fields.columnId || '') : fields.columnId;
    const ticket: Ticket = {
      id: uuidv4(),
      key: `${s.settings.projectKey}-${num}`,
      title: fields.title,
      description: fields.description ?? '',
      columnId,
      inBacklog,
      epicId: fields.epicId,
      tagIds: fields.tagIds ?? [],
      order: fields.order ?? s.tickets.filter(
        t => t.inBacklog === inBacklog && t.columnId === columnId && t.epicId === fields.epicId
      ).length,
      priority: fields.priority ?? 'medium',
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
    if ('columnId' in patch && patch.columnId !== undefined) {
      const s = get();
      const ticket = s.tickets.find(t => t.id === id);
      const fromCol = s.columns.find(c => c.id === ticket?.columnId);
      const toCol = s.columns.find(c => c.id === patch.columnId);
      if (fromCol && toCol && fromCol.id !== toCol.id) {
        const body = `Status changed from **${fromCol.name}** to **${toCol.name}**`;
        const comment: Comment = { id: uuidv4(), ticketId: id, body, createdAt: now(), updatedAt: now(), isSystem: true };
        set(s => ({ comments: [...s.comments, comment] }));
      }
    }
    set(s => ({
      tickets: s.tickets.map(t => t.id === id ? { ...t, ...patch, updatedAt: now() } : t),
    }));
    get().persist();
  },

  deleteTicket(id) {
    // Hard delete — kept for internal use (e.g. purge). UI should use trashTicket.
    set(s => ({
      tickets: s.tickets.filter(t => t.id !== id),
      trashedTickets: s.trashedTickets.filter(tr => tr.ticket.id !== id),
    }));
    get().persist();
  },

  trashTicket(id) {
    const s = get();
    const trashedAt = now();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const ticket = s.tickets.find(t => t.id === id);
    if (!ticket) return;
    set(st => ({
      tickets: st.tickets.filter(t => t.id !== id),
      trashedTickets: [...st.trashedTickets, { ticket, trashedAt, expiresAt }],
    }));
    get().persist();
  },

  restoreTicket(id) {
    const s = get();
    const entry = s.trashedTickets.find(tr => tr.ticket.id === id);
    if (!entry) return;
    set(st => ({
      tickets: [...st.tickets, entry.ticket],
      trashedTickets: st.trashedTickets.filter(tr => tr.ticket.id !== id),
    }));
    get().persist();
  },

  purgeTicket(id) {
    set(s => ({
      trashedTickets: s.trashedTickets.filter(tr => tr.ticket.id !== id),
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
    const s = get();
    const ticket = s.tickets.find(t => t.id === ticketId);
    const fromCol = s.columns.find(c => c.id === ticket?.columnId);
    const toCol = s.columns.find(c => c.id === targetColumnId);
    if (fromCol && toCol && fromCol.id !== toCol.id) {
      const body = `Status changed from **${fromCol.name}** to **${toCol.name}**`;
      const comment: Comment = { id: uuidv4(), ticketId, body, createdAt: now(), updatedAt: now(), isSystem: true };
      set(st => ({ comments: [...st.comments, comment] }));
    }
    set(s => ({
      tickets: s.tickets.map(t =>
        t.id === ticketId
          ? { ...t, columnId: targetColumnId, epicId: targetEpicId, order: newOrder, updatedAt: now() }
          : t
      ),
    }));
    get().persist();
  },

  moveToBoard(ticketId, targetColumnId) {
    const s = get();
    const ticket = s.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const newOrder = s.tickets.filter(
      t => t.columnId === targetColumnId && (t.epicId ?? null) === (ticket.epicId ?? null) && !t.inBacklog
    ).length;
    set(st => ({
      tickets: st.tickets.map(t =>
        t.id === ticketId
          ? { ...t, columnId: targetColumnId, inBacklog: false, order: newOrder, updatedAt: now() }
          : t
      ),
    }));
    get().persist();
  },

  moveToBacklog(ticketId) {
    const s = get();
    const newOrder = s.tickets.filter(t => t.inBacklog).length;
    const sorted = [...s.columns].filter(c => !c.isBacklog).sort((a, b) => a.order - b.order);
    const todoCol = sorted.find(c => c.role === 'todo' || c.isTodo) ?? sorted[0];
    set(st => ({
      tickets: st.tickets.map(t =>
        t.id === ticketId
          ? { ...t, inBacklog: true, order: newOrder, columnId: todoCol?.id ?? t.columnId, updatedAt: now() }
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

  updateComment(id, body) {
    set(s => ({
      comments: s.comments.map(c => c.id === id ? { ...c, body, updatedAt: now() } : c),
    }));
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

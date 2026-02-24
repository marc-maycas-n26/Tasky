import Dexie, { type Table } from 'dexie';
import type {
  AppState,
  AppSettings,
  Column,
  Epic,
  Tag,
  Template,
  Ticket,
  TrashedTicket,
  AutomationRule,
  Comment,
  LinkedItem,
  StorageAdapter,
} from '../types';
import { SEED_DATA } from './seed';

const SCHEMA_VERSION = 3;

class AppDatabase extends Dexie {
  columns!: Table<Column>;
  epics!: Table<Epic>;
  tags!: Table<Tag>;
  templates!: Table<Template>;
  tickets!: Table<Ticket>;
  trashedTickets!: Table<TrashedTicket & { id: string }>;
  automationRules!: Table<AutomationRule>;
  comments!: Table<Comment>;
  linkedItems!: Table<LinkedItem>;
  meta!: Table<{ key: string; value: unknown }>;

  constructor() {
    super('antigravity-tasks');
    this.version(1).stores({
      columns: 'id, order',
      epics: 'id, order',
      tags: 'id',
      templates: 'id',
      tickets: 'id, columnId, epicId, parentId, order',
      automationRules: 'id',
      meta: 'key',
    });
    this.version(2).stores({
      columns: 'id, order',
      epics: 'id, order',
      tags: 'id',
      templates: 'id',
      tickets: 'id, columnId, epicId, parentId, order',
      automationRules: 'id',
      comments: 'id, ticketId',
      linkedItems: 'id, ticketId',
      meta: 'key',
    });
    this.version(3).stores({
      columns: 'id, order',
      epics: 'id, order',
      tags: 'id',
      templates: 'id',
      tickets: 'id, columnId, epicId, parentId, order',
      automationRules: 'id',
      comments: 'id, ticketId',
      linkedItems: 'id, ticketId',
      trashedTickets: 'id, trashedAt, expiresAt',
      meta: 'key',
    });
  }
}

const db = new AppDatabase();

export class IndexedDbAdapter implements StorageAdapter {
  name = 'IndexedDB (local)';
  supportsSync = false;

  async loadAll(): Promise<AppState> {
    const [columns, epics, tags, templates, tickets, automationRules, comments, linkedItems, trashedRaw] =
      await Promise.all([
        db.columns.toArray(),
        db.epics.toArray(),
        db.tags.toArray(),
        db.templates.toArray(),
        db.tickets.toArray(),
        db.automationRules.toArray(),
        db.comments.toArray(),
        db.linkedItems.toArray(),
        db.trashedTickets.toArray(),
      ]);

    const metaEntries = await db.meta.toArray();
    const meta = Object.fromEntries(metaEntries.map((e) => [e.key, e.value]));

    if (columns.length === 0) {
      const seed = SEED_DATA;
      await this.saveAll(seed);
      return seed;
    }

    // Strip the synthetic Dexie `id` field off TrashedTicket rows
    const trashedTickets: TrashedTicket[] = trashedRaw.map(({ id: _id, ...rest }) => rest as TrashedTicket);

    return {
      schemaVersion: SCHEMA_VERSION,
      columns,
      epics,
      tags,
      templates,
      tickets,
      trashedTickets,
      automationRules,
      comments,
      linkedItems,
      nextTicketNumber: (meta['nextTicketNumber'] as number) ?? 1,
      settings: (meta['settings'] as AppSettings) ?? { projectKey: 'TM' },
    };
  }

  async saveAll(state: AppState): Promise<void> {
    // TrashedTicket has no top-level id; use ticket.id as the Dexie primary key
    const trashedRows = (state.trashedTickets ?? []).map(tr => ({ ...tr, id: tr.ticket.id }));
    await db.transaction(
      'rw',
      [db.columns, db.epics, db.tags, db.templates, db.tickets, db.automationRules, db.comments, db.linkedItems, db.trashedTickets, db.meta],
      async () => {
        await Promise.all([
          db.columns.clear().then(() => db.columns.bulkPut(state.columns)),
          db.epics.clear().then(() => db.epics.bulkPut(state.epics)),
          db.tags.clear().then(() => db.tags.bulkPut(state.tags)),
          db.templates.clear().then(() => db.templates.bulkPut(state.templates)),
          db.tickets.clear().then(() => db.tickets.bulkPut(state.tickets)),
          db.automationRules.clear().then(() => db.automationRules.bulkPut(state.automationRules)),
          db.comments.clear().then(() => db.comments.bulkPut(state.comments ?? [])),
          db.linkedItems.clear().then(() => db.linkedItems.bulkPut(state.linkedItems ?? [])),
          db.trashedTickets.clear().then(() => db.trashedTickets.bulkPut(trashedRows)),
          db.meta.put({ key: 'nextTicketNumber', value: state.nextTicketNumber }),
          db.meta.put({ key: 'settings', value: state.settings }),
          db.meta.put({ key: 'schemaVersion', value: state.schemaVersion }),
        ]);
      }
    );
  }
}

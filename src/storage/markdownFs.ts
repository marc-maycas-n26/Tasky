/**
 * Markdown File System Adapter
 *
 * Uses the browser File System Access API (Chrome/Edge) to store app data
 * in a user-picked local folder.
 *
 * Folder structure:
 *   <chosen folder>/
 *     _tasky_meta.json          ← metadata (columns, epics, tags, settings, …)
 *     _archive/                 ← managed by Tasky — do not rename or move
 *       Backlog/
 *         TM-4 · Explore auth.md
 *       Released/
 *         20260225/             ← YYYYMMDD of releasedAt, one folder per release
 *           TM-1 · Set up repo.md
 *           TM-2 · Configure CI.md
 *       Deleted/
 *         TM-5 · Old ticket.md
 *     userStatus/               ← one subfolder per user-defined column
 *       To Do/
 *         TM-3 · Design tokens.md
 *       In Progress/
 *         TM-2 · Configure CI.md
 *       Done/
 *         TM-1 · Set up repo.md
 *
 * The FileSystemDirectoryHandle is persisted in IndexedDB so it survives
 * page reloads. On reload the browser re-grants permission silently if the
 * user had previously allowed it (no picker shown).
 *
 * Manually dropping a .md file into any column subfolder will import it as
 * a new ticket in that column on the next load.
 */

import type { AppState, Column, StorageAdapter, Ticket } from '../types';
import Dexie, { type Table } from 'dexie';

const META_FILE = '_tasky_meta.json';
const HANDLE_DB_KEY = 'markdownFolderHandle';

// ── Folder constants (managed by Tasky — not renameable) ─────────────────────
const ARCHIVE_FOLDER      = '_archive';
const BACKLOG_FOLDER      = 'Backlog';
const RELEASED_FOLDER     = 'Released';
const DELETED_FOLDER      = 'Deleted';
const USER_STATUS_FOLDER  = 'userStatus';

/** Convert an ISO timestamp to a YYYYMMDD folder name (local time) */
function toDateFolder(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// ── Persist the directory handle in its own tiny IndexedDB ───────────────────

class HandleDb extends Dexie {
  handles!: Table<{ key: string; handle: FileSystemDirectoryHandle }>;
  constructor() {
    super('tasky-fs-handle');
    this.version(1).stores({ handles: 'key' });
  }
}
const handleDb = new HandleDb();

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  await handleDb.handles.put({ key: HANDLE_DB_KEY, handle });
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const row = await handleDb.handles.get(HANDLE_DB_KEY);
  return row?.handle ?? null;
}

export async function clearDirectoryHandle() {
  await handleDb.handles.delete(HANDLE_DB_KEY);
}

/**
 * Try to restore a previously-granted handle. Returns the handle if
 * permission is already granted or can be granted without a prompt.
 * Returns null if the user must pick the folder again.
 */
export async function restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadDirectoryHandle();
  if (!handle) return null;
  try {
    // queryPermission is synchronous — if already granted we never show a prompt
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return handle;
    // Try to regain without showing a picker (works if the browser remembers)
    const req = await handle.requestPermission({ mode: 'readwrite' });
    return req === 'granted' ? handle : null;
  } catch {
    return null;
  }
}

// ── HTML ↔ Markdown conversion ───────────────────────────────────────────────

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return nodeToMd(div).trim();
}

function nodeToMd(node: Node, indent = ''): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Task list (TipTap: <ul data-type="taskList">)
  if (tag === 'ul' && el.getAttribute('data-type') === 'taskList') {
    return Array.from(el.children).map(child => {
      const li = child as HTMLElement;
      const checked = li.getAttribute('data-checked') === 'true';
      const checkbox = checked ? '- [x] ' : '- [ ] ';
      // Content is in a <div> or <p> child; nested lists are also children
      let text = '';
      let nested = '';
      for (const c of Array.from(li.childNodes)) {
        const n = c as HTMLElement;
        if (n.nodeType === Node.ELEMENT_NODE) {
          const t = (n as HTMLElement).tagName?.toLowerCase();
          if (t === 'ul' || t === 'ol') {
            nested += nodeToMd(n, indent + '  ');
          } else {
            text += nodeToMd(n, indent);
          }
        } else {
          text += nodeToMd(n, indent);
        }
      }
      return `${indent}${checkbox}${text.trim()}\n${nested}`;
    }).join('');
  }

  const inner = Array.from(el.childNodes).map(n => nodeToMd(n, indent)).join('');
  switch (tag) {
    case 'h1': return `# ${inner}\n\n`;
    case 'h2': return `## ${inner}\n\n`;
    case 'h3': return `### ${inner}\n\n`;
    case 'h4': return `#### ${inner}\n\n`;
    case 'strong': case 'b': return `**${inner}**`;
    case 'em': case 'i':     return `*${inner}*`;
    case 'u':                return `__${inner}__`;
    case 'code':             return `\`${inner}\``;
    case 'pre':              return `\`\`\`\n${el.textContent ?? ''}\n\`\`\`\n\n`;
    case 'a':                return `[${inner}](${el.getAttribute('href') ?? ''})`;
    case 'li':               return `${indent}- ${inner}\n`;
    case 'ul': case 'ol':   return `${inner}\n`;
    case 'br':               return '\n';
    case 'p':                return `${inner}\n\n`;
    case 'hr':               return `---\n\n`;
    default:                 return inner;
  }
}

function markdownToHtml(md: string): string {
  if (!md) return '';

  // Split into lines and process task list items as a group
  const lines = md.split('\n');
  const outputLines: string[] = [];
  let inTaskList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(/^(\s*)- \[(x| )\] (.*)$/);
    if (taskMatch) {
      if (!inTaskList) {
        outputLines.push('<ul data-type="taskList">');
        inTaskList = true;
      }
      const checked = taskMatch[2] === 'x';
      const text = taskMatch[3];
      outputLines.push(
        `<li data-checked="${checked}" data-type="taskItem"><label><input type="checkbox"${checked ? ' checked' : ''}/></label><div><p>${text}</p></div></li>`
      );
    } else {
      if (inTaskList) {
        outputLines.push('</ul>');
        inTaskList = false;
      }
      outputLines.push(line);
    }
  }
  if (inTaskList) outputLines.push('</ul>');

  let html = outputLines.join('\n')
    .replace(/```[\s\S]*?```/g, m => `<pre><code>${m.slice(3, -3).trim()}</code></pre>`)
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    .replace(/__(.+?)__/g,    '<u>$1</u>')
    .replace(/`(.+?)`/g,      '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm,    '<li>$1</li>')
    .replace(/\n{2,}/g,       '</p><p>')
    .trim();
  if (!html.startsWith('<')) html = `<p>${html}</p>`;
  return html;
}

// ── Filename helpers ──────────────────────────────────────────────────────────

function toFilename(ticket: Ticket): string {
  const safeTitle = ticket.title.replace(/[/\\:*?"<>|]/g, '-').slice(0, 80);
  return `${ticket.key} · ${safeTitle}.md`;
}

/** Safe folder name from a column name (strip filesystem-illegal chars) */
function toFolderName(column: Column): string {
  return column.name.replace(/[/\\:*?"<>|]/g, '-').slice(0, 60);
}

function parseKeyFromFilename(filename: string): string | null {
  const m = filename.match(/^([A-Z]+-\d+)\s*·/);
  return m ? m[1] : null;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class MarkdownFsAdapter implements StorageAdapter {
  name = 'Markdown files';
  supportsSync = false;

  private dirHandle: FileSystemDirectoryHandle;

  constructor(dirHandle: FileSystemDirectoryHandle) {
    this.dirHandle = dirHandle;
  }

  // ── subfolder helpers ────────────────────────────────────────────────────────

  private async getSubfolder(name: string, create = true): Promise<FileSystemDirectoryHandle> {
    return this.dirHandle.getDirectoryHandle(name, { create });
  }

  private async subfolderExists(name: string): Promise<boolean> {
    try {
      await this.dirHandle.getDirectoryHandle(name, { create: false });
      return true;
    } catch {
      return false;
    }
  }

  /** Get (and create if needed) userStatus/<columnFolderName> */
  private async getColumnFolder(columnFolderName: string, create = true): Promise<FileSystemDirectoryHandle> {
    const userStatus = await this.dirHandle.getDirectoryHandle(USER_STATUS_FOLDER, { create });
    return userStatus.getDirectoryHandle(columnFolderName, { create });
  }

  private async columnFolderExists(columnFolderName: string): Promise<boolean> {
    try {
      const userStatus = await this.dirHandle.getDirectoryHandle(USER_STATUS_FOLDER, { create: false });
      await userStatus.getDirectoryHandle(columnFolderName, { create: false });
      return true;
    } catch {
      return false;
    }
  }

  /** Get (and create if needed) _archive, then a named subfolder inside it */
  private async getArchiveSubfolder(name: string): Promise<FileSystemDirectoryHandle> {
    const archive = await this.dirHandle.getDirectoryHandle(ARCHIVE_FOLDER, { create: true });
    return archive.getDirectoryHandle(name, { create: true });
  }

  /**
   * Get _archive/Released/<YYYYMMDD> folder for a given ISO timestamp.
   * Creates all intermediate directories.
   */
  private async getReleasedDateFolder(isoDate: string): Promise<FileSystemDirectoryHandle> {
    const archive  = await this.dirHandle.getDirectoryHandle(ARCHIVE_FOLDER, { create: true });
    const released = await archive.getDirectoryHandle(RELEASED_FOLDER, { create: true });
    return released.getDirectoryHandle(toDateFolder(isoDate), { create: true });
  }

  private async readTextFile(
    name: string,
    folder?: FileSystemDirectoryHandle,
  ): Promise<string | null> {
    try {
      const dir = folder ?? this.dirHandle;
      const fh = await dir.getFileHandle(name);
      return await (await fh.getFile()).text();
    } catch {
      return null;
    }
  }

  private async writeTextFile(
    name: string,
    content: string,
    folder?: FileSystemDirectoryHandle,
  ): Promise<void> {
    const dir = folder ?? this.dirHandle;
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(content);
    await w.close();
  }

  private async deleteFileFromFolder(
    name: string,
    folder: FileSystemDirectoryHandle,
  ): Promise<void> {
    try {
      await folder.removeEntry(name);
    } catch { /* ignore */ }
  }

  /** List all .md filenames inside a subfolder */
  private async listMdInFolder(folder: FileSystemDirectoryHandle): Promise<string[]> {
    const names: string[] = [];
    for await (const [name, handle] of folder.entries()) {
      if (handle.kind === 'file' && name.endsWith('.md')) names.push(name);
    }
    return names;
  }

  // ── StorageAdapter ──────────────────────────────────────────────────────────

  async loadAll(): Promise<AppState> {
    const metaText = await this.readTextFile(META_FILE);

    if (!metaText) {
      // First run — seed, then immediately save so files appear
      const { SEED_DATA } = await import('./seed');
      await this.saveAll(SEED_DATA);
      return { ...SEED_DATA };
    }

    const meta = JSON.parse(metaText) as AppState & { _tickets?: Omit<Ticket, 'description'>[] };
    const columns: Column[] = meta.columns ?? [];

    // Build column lookup: id → subfolder name
    const colFolderName = new Map(columns.map(c => [c.id, toFolderName(c)]));

    // Reconstruct tickets from stored metadata + .md file descriptions
    const tickets: Ticket[] = [];
    const trackedKeys = new Set<string>();

    // Migration: derive inBacklog from old isBacklog column flag if missing
    const backlogColIds = new Set(columns.filter(c => c.isBacklog).map(c => c.id));

    for (const t of meta._tickets ?? []) {
      const raw = t as Ticket & { inBacklog?: boolean };
      const inBacklog = raw.inBacklog ?? backlogColIds.has(raw.columnId);
      let description = '';
      if (inBacklog) {
        // Read description from _archive/Backlog/ (fall back to root for legacy files)
        try {
          const backlogFolder = await this.getArchiveSubfolder(BACKLOG_FOLDER);
          const md = await this.readTextFile(toFilename(raw), backlogFolder);
          if (md) {
            description = markdownToHtml(md);
          } else {
            // Legacy: file may still be in root
            const legacyMd = await this.readTextFile(toFilename(raw));
            description = legacyMd ? markdownToHtml(legacyMd) : '';
          }
        } catch { /* folder may not exist yet */ }
      } else {
        const folderName = colFolderName.get(raw.columnId);
        if (folderName) {
          try {
            // Try userStatus/<col>/ first, fall back to legacy root-level folder
            const subfolder = await this.getColumnFolder(folderName, false);
            const md = await this.readTextFile(toFilename(raw), subfolder);
            if (md) {
              description = markdownToHtml(md);
            } else {
              // Legacy: file may still be in a root-level column folder
              const legacyFolder = await this.getSubfolder(folderName, false);
              const legacyMd = await this.readTextFile(toFilename(raw), legacyFolder);
              description = legacyMd ? markdownToHtml(legacyMd) : '';
            }
          } catch { /* folder may not exist yet */ }
        }
      }
      tickets.push({ ...raw, inBacklog, description });
      trackedKeys.add(raw.key);
    }

    // Auto-import manually-created .md files in any column subfolder
    const { v4: uuidv4 } = await import('uuid');

    for (const col of columns) {
      if (col.isBacklog) continue;
      const folderName = toFolderName(col);

      // Check userStatus/<col>/ first, then root-level legacy folder
      const folders: Array<FileSystemDirectoryHandle> = [];
      if (await this.columnFolderExists(folderName)) {
        folders.push(await this.getColumnFolder(folderName, false));
      }
      // Legacy: also scan root-level folder if it still exists
      if (await this.subfolderExists(folderName)) {
        folders.push(await this.getSubfolder(folderName, false));
      }

      for (const subfolder of folders) {
        const mdFiles = await this.listMdInFolder(subfolder);
        for (const filename of mdFiles) {
          const key = parseKeyFromFilename(filename);
          if (!key || trackedKeys.has(key)) continue;

          const mdText = await this.readTextFile(filename, subfolder) ?? '';
          const titleMatch = filename.match(/^[A-Z]+-\d+\s*·\s*(.+)\.md$/);
          const title = titleMatch ? titleMatch[1] : filename.replace(/\.md$/, '');
          const now = new Date().toISOString();

          tickets.push({
            id: uuidv4(),
            key,
            title,
            description: markdownToHtml(mdText),
            columnId: col.id,
            inBacklog: false,
            tagIds: [],
            order: tickets.length,
            createdAt: now,
            updatedAt: now,
          });
          trackedKeys.add(key);
        }
      }
    }

    // Auto-import from _archive/Backlog/ — treat as backlog items
    try {
      const backlogFolder = await this.getArchiveSubfolder(BACKLOG_FOLDER);
      const mdFiles = await this.listMdInFolder(backlogFolder);
      for (const filename of mdFiles) {
        const key = parseKeyFromFilename(filename);
        if (!key || trackedKeys.has(key)) continue;
        const mdText = await this.readTextFile(filename, backlogFolder) ?? '';
        const titleMatch = filename.match(/^[A-Z]+-\d+\s*·\s*(.+)\.md$/);
        const title = titleMatch ? titleMatch[1] : filename.replace(/\.md$/, '');
        const now = new Date().toISOString();
        tickets.push({
          id: uuidv4(), key, title,
          description: markdownToHtml(mdText),
          columnId: '', inBacklog: true,
          tagIds: [], order: tickets.length,
          createdAt: now, updatedAt: now,
        });
        trackedKeys.add(key);
      }
    } catch { /* _archive/Backlog may not exist yet */ }

    // Also scan root for legacy flat .md files — treat as backlog items
    for await (const [name, handle] of this.dirHandle.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.md')) continue;
      const key = parseKeyFromFilename(name);
      if (!key || trackedKeys.has(key)) continue;

      const mdText = await this.readTextFile(name) ?? '';
      const titleMatch = name.match(/^[A-Z]+-\d+\s*·\s*(.+)\.md$/);
      const title = titleMatch ? titleMatch[1] : name.replace(/\.md$/, '');
      const now = new Date().toISOString();

      tickets.push({
        id: uuidv4(),
        key,
        title,
        description: markdownToHtml(mdText),
        columnId: '',
        inBacklog: true,
        tagIds: [],
        order: tickets.length,
        createdAt: now,
        updatedAt: now,
      });
      trackedKeys.add(key);
    }

    // Strip old isBacklog columns — backlog is now a ticket flag
    const migratedColumns = columns.filter(c => !c.isBacklog);

    return {
      schemaVersion: meta.schemaVersion ?? 1,
      columns: migratedColumns,
      epics: meta.epics ?? [],
      tags: meta.tags ?? [],
      tickets,
      trashedTickets: meta.trashedTickets ?? [],
      releasedEpics: meta.releasedEpics ?? [],
      templates: meta.templates ?? [],
      automationRules: meta.automationRules ?? [],
      comments: meta.comments ?? [],
      linkedItems: meta.linkedItems ?? [],
      nextTicketNumber: meta.nextTicketNumber ?? 1,
      settings: meta.settings ?? { projectKey: 'TM' },
    };
  }

  async saveAll(state: AppState): Promise<void> {
    const columns = state.columns;

    // ── userStatus/<col>/ subfolders (board tickets) ─────────────────────────
    const colFolderHandles = new Map<string, FileSystemDirectoryHandle>();
    for (const col of columns) {
      const fh = await this.getColumnFolder(toFolderName(col));
      colFolderHandles.set(col.id, fh);
    }

    const activeColFiles = new Map<FileSystemDirectoryHandle, Set<string>>();
    for (const fh of colFolderHandles.values()) {
      activeColFiles.set(fh, new Set());
    }

    for (const ticket of state.tickets) {
      if (ticket.inBacklog) continue; // handled separately below
      const subfolder = colFolderHandles.get(ticket.columnId);
      if (!subfolder) continue;
      const filename = toFilename(ticket);
      await this.writeTextFile(filename, htmlToMarkdown(ticket.description), subfolder);
      activeColFiles.get(subfolder)!.add(filename);
    }

    // Remove stale .md files from each column subfolder
    for (const [subfolder, active] of activeColFiles) {
      const existing = await this.listMdInFolder(subfolder);
      for (const name of existing) {
        if (!active.has(name)) await this.deleteFileFromFolder(name, subfolder);
      }
    }

    // ── _archive/Backlog/ ────────────────────────────────────────────────────
    const backlogFolder = await this.getArchiveSubfolder(BACKLOG_FOLDER);
    const activeBacklogFiles = new Set<string>();
    for (const ticket of state.tickets) {
      if (!ticket.inBacklog) continue;
      const filename = toFilename(ticket);
      await this.writeTextFile(filename, htmlToMarkdown(ticket.description), backlogFolder);
      activeBacklogFiles.add(filename);
    }
    // Remove stale files from backlog folder
    for (const name of await this.listMdInFolder(backlogFolder)) {
      if (!activeBacklogFiles.has(name)) await this.deleteFileFromFolder(name, backlogFolder);
    }

    // ── _archive/Deleted/ ────────────────────────────────────────────────────
    const deletedFolder = await this.getArchiveSubfolder(DELETED_FOLDER);
    const activeDeletedFiles = new Set<string>();
    for (const { ticket } of state.trashedTickets ?? []) {
      if (ticket.parentId) continue; // skip subtasks — they'd clutter the folder
      const filename = toFilename(ticket);
      await this.writeTextFile(filename, htmlToMarkdown(ticket.description), deletedFolder);
      activeDeletedFiles.add(filename);
    }
    // Remove stale files from deleted folder
    for (const name of await this.listMdInFolder(deletedFolder)) {
      if (!activeDeletedFiles.has(name)) await this.deleteFileFromFolder(name, deletedFolder);
    }

    // ── _archive/Released/<YYYYMMDD>/ ────────────────────────────────────────
    // Build a map of dateKey → { folder handle, active filenames }
    const releasedDateFolders = new Map<string, { fh: FileSystemDirectoryHandle; active: Set<string> }>();
    for (const release of state.releasedEpics ?? []) {
      const dateKey = toDateFolder(release.releasedAt);
      if (!releasedDateFolders.has(dateKey)) {
        const fh = await this.getReleasedDateFolder(release.releasedAt);
        releasedDateFolders.set(dateKey, { fh, active: new Set() });
      }
      const { fh, active } = releasedDateFolders.get(dateKey)!;
      for (const ticket of release.tickets) {
        if (ticket.parentId) continue; // skip subtasks
        const filename = toFilename(ticket);
        await this.writeTextFile(filename, htmlToMarkdown(ticket.description), fh);
        active.add(filename);
      }
    }
    // Remove stale files inside each dated release folder
    for (const { fh, active } of releasedDateFolders.values()) {
      for (const name of await this.listMdInFolder(fh)) {
        if (!active.has(name)) await this.deleteFileFromFolder(name, fh);
      }
    }

    // ── _tasky_meta.json ─────────────────────────────────────────────────────
    const { tickets, ...rest } = state;
    const meta = {
      ...rest,
      _tickets: tickets.map(({ description: _d, ...t }) => t),
    };
    await this.writeTextFile(META_FILE, JSON.stringify(meta, null, 2));
  }
}

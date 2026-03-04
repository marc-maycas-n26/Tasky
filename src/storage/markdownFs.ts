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

import type { AppState, Column, Comment, Epic, StorageAdapter, Tag, Ticket } from '../types';
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
 * Delete all Tasky-managed files and folders from the connected directory.
 * Removes: _tasky_meta.json, _archive/, userStatus/
 * Leaves any unrelated files the user may have in the folder untouched.
 */
export async function clearMarkdownFolder(): Promise<void> {
  const handle = await loadDirectoryHandle();
  if (!handle) return;
  const toRemove = [META_FILE, ARCHIVE_FOLDER, USER_STATUS_FOLDER];
  for (const name of toRemove) {
    try {
      await handle.removeEntry(name, { recursive: true });
    } catch { /* entry may not exist yet — ignore */ }
  }
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

const BLOCK_TAGS = new Set(['p','h1','h2','h3','h4','ul','ol','li','pre','blockquote','div','hr','table']);

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;

  // Pass 1: wrap bare <li> elements (not inside a list) into a <ul>
  let changed = true;
  while (changed) {
    changed = false;
    for (const child of Array.from(div.childNodes)) {
      const el = child as HTMLElement;
      if (el.nodeType === Node.ELEMENT_NODE && el.tagName?.toLowerCase() === 'li') {
        const ul = document.createElement('ul');
        div.insertBefore(ul, el);
        ul.appendChild(el);
        changed = true;
        break;
      }
    }
  }

  // Pass 2: group consecutive inline/text nodes into a <p>
  // so bare text and inline elements (links, spans) get proper paragraph breaks
  const children = Array.from(div.childNodes);
  let inlineBuffer: ChildNode[] = [];

  function flushInline() {
    if (!inlineBuffer.length) return;
    const hasContent = inlineBuffer.some(n =>
      n.nodeType === Node.TEXT_NODE ? (n.textContent ?? '').trim() !== '' : true
    );
    if (hasContent) {
      const p = document.createElement('p');
      inlineBuffer.forEach(n => p.appendChild(n.cloneNode(true)));
      div.insertBefore(p, inlineBuffer[0]);
    }
    inlineBuffer.forEach(n => { if (n.parentNode === div) div.removeChild(n); });
    inlineBuffer = [];
  }

  for (const child of children) {
    const tag = (child as HTMLElement).tagName?.toLowerCase();
    if (child.nodeType === Node.TEXT_NODE || !BLOCK_TAGS.has(tag)) {
      inlineBuffer.push(child);
    } else {
      flushInline();
    }
  }
  flushInline();

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
    case 'img':              return `![${el.getAttribute('alt') ?? ''}](${el.getAttribute('src') ?? ''})\n\n`;
    case 'li':               return `${indent}- ${inner}\n`;
    case 'ul': case 'ol':   return `${inner}\n`;
    case 'br':               return '\n';
    case 'p': {
      // If the <p> contains block-level children (malformed HTML from paste),
      // don't wrap with paragraph — just render inner content directly
      const blockTags = new Set(['ul','ol','li','h1','h2','h3','h4','pre','blockquote','div']);
      const hasBlock = Array.from(el.childNodes).some(
        c => c.nodeType === Node.ELEMENT_NODE && blockTags.has((c as HTMLElement).tagName?.toLowerCase())
      );
      return hasBlock ? `${inner}\n` : `${inner}\n\n`;
    }
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
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm,    '<li>$1</li>')
    .trim();

  // Split on paragraph boundaries, preserving blank paragraphs.
  // Each <p> emits inner + '\n\n', so:
  //   one paragraph gap  = '\n\n'  → </p><p>
  //   two paragraph gaps = '\n\n\n\n' → </p><p></p><p>  (blank paragraph preserved)
  const BLOCK_START = /^<(h[1-4]|ul|ol|li|pre|blockquote|hr|div|table)/i;
  const parts = html.split('\n\n');
  const wrapped = parts.map(part => {
    if (part === '') return '<p></p>';         // blank paragraph
    if (BLOCK_START.test(part)) return part;  // block-level HTML — don't wrap
    return `<p>${part}</p>`;                  // text or inline HTML — wrap in <p>
  }).join('');

  return wrapped || '<p></p>';
}

// ── Filename helpers ──────────────────────────────────────────────────────────

function toFilename(ticket: Ticket): string {
  const safeTitle = String(ticket.title ?? '').replace(/[/\\:*?"<>|]/g, '-').slice(0, 80);
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

// ── Front matter ──────────────────────────────────────────────────────────────
//
// Each .md file is structured as:
//
//   ---
//   id: <uuid>
//   key: TM-4
//   title: Build Input and Select components
//   status: Development          ← column name, or "Backlog"
//   inBacklog: false
//   epic: Authentication         ← epic title (resolved on load)
//   priority: high
//   tags: [frontend, backend]    ← tag names (resolved on load)
//   parent: TM-2                 ← parent ticket key (for subtasks)
//   order: 0
//   dueDate: 2026-03-15
//   createdAt: 2026-02-27T10:00:00.000Z
//   updatedAt: 2026-02-27T10:00:00.000Z
//   ---
//
//   <description body in Markdown>
//
// Names (not IDs) are used for epic, tags and status so the file is
// self-contained and readable/reconstructable in any other app.

interface TicketFrontMatter {
  id: string;
  key: string;
  title: string;
  status: string;       // column name or "Backlog"
  inBacklog: boolean;
  epic?: string;        // epic title
  priority?: string;
  tags?: string[];      // tag names
  parent?: string;      // parent ticket key
  order: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serialise a Ticket + lookup tables → full .md file content with front matter.
 * If ticketComments is provided, a ## Sitrep section is appended after the body.
 */
function serializeTicketFile(
  ticket: Ticket,
  allColumns: Column[],
  allEpics: Epic[],
  allTags: Tag[],
  ticketComments: Comment[] = [],
): string {
  const columnName = ticket.inBacklog
    ? 'Backlog'
    : (allColumns.find(c => c.id === ticket.columnId)?.name ?? ticket.columnId);
  const epicTitle = ticket.epicId
    ? (allEpics.find(e => e.id === ticket.epicId)?.title ?? ticket.epicId)
    : undefined;
  const tagNames = ticket.tagIds
    .map(id => allTags.find(t => t.id === id)?.name)
    .filter((n): n is string => !!n);

  const fm: TicketFrontMatter = {
    id: ticket.id,
    key: ticket.key,
    title: ticket.title,
    status: columnName,
    inBacklog: ticket.inBacklog,
    ...(epicTitle      ? { epic: epicTitle }         : {}),
    ...(ticket.priority ? { priority: ticket.priority } : {}),
    ...(tagNames.length ? { tags: tagNames }          : {}),
    ...(ticket.parentId ? { parent: ticket.parentId } : {}),
    order: ticket.order,
    ...(ticket.dueDate  ? { dueDate: ticket.dueDate } : {}),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map(s => `"${s}"`).join(', ')}]`);
    } else if (typeof v === 'boolean') {
      lines.push(`${k}: ${v}`);
    } else if (typeof v === 'string' && /[:\[\]{}"'#|>&*!,%@`]/.test(v)) {
      lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---');
  lines.push('');

  const body = htmlToMarkdown(ticket.description);
  if (body) lines.push(body);

  // Append sitrep (comments) section if there are any
  if (ticketComments.length > 0) {
    // Ensure a blank line before the section header
    if (body && !lines[lines.length - 1].endsWith('\n')) lines.push('');
    lines.push('## Sitrep');
    lines.push('');
    const sorted = [...ticketComments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    for (const comment of sorted) {
      lines.push(`<!-- sitrep:${comment.id} createdAt:${comment.createdAt}${comment.updatedAt && comment.updatedAt !== comment.createdAt ? ` updatedAt:${comment.updatedAt}` : ''} -->`);
      lines.push(htmlToMarkdown(comment.body).trim());
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Parse a .md file content → front matter fields + description HTML + sitrep comments.
 * Falls back gracefully if there is no front matter (legacy files).
 */
function parseTicketFile(content: string): {
  frontMatter: Partial<TicketFrontMatter>;
  description: string;
  parsedComments: Array<{ id: string; body: string; createdAt: string; updatedAt: string }>;
} {
  if (!content.startsWith('---')) {
    return { frontMatter: {}, description: markdownToHtml(content), parsedComments: [] };
  }

  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return { frontMatter: {}, description: markdownToHtml(content), parsedComments: [] };
  }

  const fmBlock = content.slice(4, end);           // between the two ---
  const afterFm = content.slice(end + 4).replace(/^\n/, ''); // after closing ---

  const frontMatter: Partial<TicketFrontMatter> = {};
  for (const line of fmBlock.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const raw = line.slice(colon + 1).trim();

    if (raw.startsWith('[')) {
      // Array: ["a", "b"] or [a, b]
      frontMatter[key as keyof TicketFrontMatter] = raw
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean) as never;
    } else if (raw === 'true') {
      frontMatter[key as keyof TicketFrontMatter] = true as never;
    } else if (raw === 'false') {
      frontMatter[key as keyof TicketFrontMatter] = false as never;
    } else if (raw !== '' && !isNaN(Number(raw)) && !(['title', 'key', 'status', 'epic', 'priority', 'parent', 'id', 'dueDate', 'createdAt', 'updatedAt'].includes(key))) {
      frontMatter[key as keyof TicketFrontMatter] = Number(raw) as never;
    } else {
      const unquoted = raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1).replace(/\\"/g, '"')
        : raw;
      frontMatter[key as keyof TicketFrontMatter] = unquoted as never;
    }
  }

  // Split body from sitrep section (## Sitrep on its own line)
  const sitrepMatch = afterFm.match(/^([\s\S]*?)\n## Sitrep\n([\s\S]*)$/m);
  const bodyMd   = sitrepMatch ? sitrepMatch[1] : afterFm;
  const sitrepMd = sitrepMatch ? sitrepMatch[2] : '';

  // Parse individual sitrep entries separated by <!-- sitrep:id ... --> tags
  const parsedComments: Array<{ id: string; body: string; createdAt: string; updatedAt: string }> = [];
  if (sitrepMd) {
    const entryRegex = /<!--\s*sitrep:(\S+)\s+createdAt:(\S+)(?:\s+updatedAt:(\S+))?\s*-->([\s\S]*?)(?=<!--\s*sitrep:|$)/g;
    let m: RegExpExecArray | null;
    while ((m = entryRegex.exec(sitrepMd)) !== null) {
      const id        = m[1];
      const createdAt = m[2];
      const updatedAt = m[3] ?? m[2];
      const bodyText  = m[4].trim();
      parsedComments.push({ id, body: markdownToHtml(bodyText), createdAt, updatedAt });
    }
  }

  return { frontMatter, description: markdownToHtml(bodyMd), parsedComments };
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
      // Empty folder — return a blank state; the app will show the board empty.
      return {
        schemaVersion: 1,
        columns: [], epics: [], tags: [], tickets: [],
        trashedTickets: [], releasedEpics: [], templates: [],
        automationRules: [], comments: [], linkedItems: [],
        nextTicketNumber: 1,
        settings: { projectKey: 'TM' },
      };
    }

    const meta = JSON.parse(metaText) as AppState & { _tickets?: Omit<Ticket, 'description'>[] };
    const columns: Column[] = meta.columns ?? [];
    const epics:   Epic[]   = meta.epics   ?? [];
    const tags:    Tag[]    = meta.tags    ?? [];

    // Build lookups for resolving front-matter names → IDs
    const colFolderName    = new Map(columns.map(c => [c.id, toFolderName(c)]));
    const colNameToId      = new Map(columns.map(c => [c.name, c.id]));
    const epicTitleToId    = new Map(epics.map(e => [e.title, e.id]));
    const tagNameToId      = new Map(tags.map(t => [t.name, t.id]));

    const tickets: Ticket[] = [];
    const parsedCommentsList: Array<{ id: string; ticketId: string; body: string; createdAt: string; updatedAt: string }> = [];
    const trackedKeys = new Set<string>();

    // Migration: derive inBacklog from old isBacklog column flag if missing
    const backlogColIds = new Set(columns.filter(c => c.isBacklog).map(c => c.id));

    /**
     * Merge front-matter fields from a parsed file into a ticket stub.
     * Front matter wins over meta JSON for all fields it contains.
     */
    const applyFrontMatter = (
      base: Omit<Ticket, 'description'> & { inBacklog?: boolean },
      fm: Partial<TicketFrontMatter>,
      fallbackColumnId: string,
      fallbackInBacklog: boolean,
    ): Omit<Ticket, 'description'> => {
      // Resolve status → columnId + inBacklog
      let columnId  = fallbackColumnId;
      let inBacklog = fallbackInBacklog;
      if (fm.status !== undefined) {
        if (fm.status === 'Backlog') {
          inBacklog = true;
          columnId  = '';
        } else {
          inBacklog = false;
          columnId  = colNameToId.get(fm.status) ?? fallbackColumnId;
        }
      }

      // Resolve epic title → id
      const epicId = fm.epic !== undefined
        ? (epicTitleToId.get(fm.epic) ?? base.epicId)
        : base.epicId;

      // Resolve tag names → ids
      const tagIds = fm.tags && fm.tags.length > 0
        ? fm.tags.map(n => tagNameToId.get(n)).filter((id): id is string => !!id)
        : base.tagIds;

      return {
        id:        fm.id        ?? base.id,
        key:       fm.key       ?? base.key,
        title:     fm.title     ?? base.title,
        columnId,
        inBacklog,
        epicId,
        tagIds,
        parentId:  fm.parent    ?? base.parentId,
        order:     fm.order     ?? base.order,
        priority:  (fm.priority as Ticket['priority']) ?? base.priority,
        dueDate:   fm.dueDate   ?? base.dueDate,
        createdAt: fm.createdAt ?? base.createdAt,
        updatedAt: fm.updatedAt ?? base.updatedAt,
      };
    };

    for (const t of meta._tickets ?? []) {
      const raw = t as Ticket & { inBacklog?: boolean };
      const inBacklog = raw.inBacklog ?? backlogColIds.has(raw.columnId);
      let fileContent: string | null = null;

      if (inBacklog) {
        try {
          const backlogFolder = await this.getArchiveSubfolder(BACKLOG_FOLDER);
          fileContent = await this.readTextFile(toFilename(raw), backlogFolder);
          if (!fileContent) fileContent = await this.readTextFile(toFilename(raw)); // legacy root
        } catch { /* folder may not exist yet */ }
      } else {
        const folderName = colFolderName.get(raw.columnId);
        if (folderName) {
          try {
            const subfolder = await this.getColumnFolder(folderName, false);
            fileContent = await this.readTextFile(toFilename(raw), subfolder);
            if (!fileContent) {
              // Legacy: root-level column folder
              const legacyFolder = await this.getSubfolder(folderName, false);
              fileContent = await this.readTextFile(toFilename(raw), legacyFolder);
            }
          } catch { /* folder may not exist yet */ }
        }
      }

      const { frontMatter: fm, description, parsedComments } = fileContent
        ? parseTicketFile(fileContent)
        : { frontMatter: {}, description: '', parsedComments: [] };

      const merged = applyFrontMatter(raw, fm, raw.columnId, inBacklog);
      tickets.push({ ...merged, description });
      trackedKeys.add(merged.key);
      for (const c of parsedComments) {
        parsedCommentsList.push({ ...c, ticketId: merged.id });
      }
    }

    // Auto-import manually-created .md files (with or without front matter)
    const { v4: uuidv4 } = await import('uuid');

    const importFromFolder = async (
      subfolder: FileSystemDirectoryHandle,
      defaultColumnId: string,
      defaultInBacklog: boolean,
    ) => {
      const mdFiles = await this.listMdInFolder(subfolder);
      for (const filename of mdFiles) {
        const key = parseKeyFromFilename(filename);
        if (!key || trackedKeys.has(key)) continue;

        const fileContent = await this.readTextFile(filename, subfolder) ?? '';
        const { frontMatter: fm, description, parsedComments } = parseTicketFile(fileContent);
        const titleMatch = filename.match(/^[A-Z]+-\d+\s*·\s*(.+)\.md$/);
        const titleFallback = titleMatch ? titleMatch[1] : filename.replace(/\.md$/, '');
        const nowStr = new Date().toISOString();

        const stub: Omit<Ticket, 'description'> & { inBacklog?: boolean } = {
          id: uuidv4(), key,
          title: titleFallback,
          columnId: defaultColumnId,
          inBacklog: defaultInBacklog,
          tagIds: [], order: tickets.length,
          createdAt: nowStr, updatedAt: nowStr,
        };
        const merged = applyFrontMatter(stub, fm, defaultColumnId, defaultInBacklog);
        tickets.push({ ...merged, title: fm.title ?? titleFallback, description });
        trackedKeys.add(key);
        for (const c of parsedComments) {
          parsedCommentsList.push({ ...c, ticketId: merged.id });
        }
      }
    };

    for (const col of columns) {
      if (col.isBacklog) continue;
      const folderName = toFolderName(col);
      if (await this.columnFolderExists(folderName)) {
        await importFromFolder(await this.getColumnFolder(folderName, false), col.id, false);
      }
      if (await this.subfolderExists(folderName)) {
        await importFromFolder(await this.getSubfolder(folderName, false), col.id, false);
      }
    }

    try {
      const backlogFolder = await this.getArchiveSubfolder(BACKLOG_FOLDER);
      await importFromFolder(backlogFolder, '', true);
    } catch { /* _archive/Backlog may not exist yet */ }

    // Legacy: root-level .md files → backlog
    for await (const [name, handle] of this.dirHandle.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.md')) continue;
      const key = parseKeyFromFilename(name);
      if (!key || trackedKeys.has(key)) continue;
      const fileContent = await this.readTextFile(name) ?? '';
      const { frontMatter: fm, description, parsedComments } = parseTicketFile(fileContent);
      const titleMatch = name.match(/^[A-Z]+-\d+\s*·\s*(.+)\.md$/);
      const titleFallback = titleMatch ? titleMatch[1] : name.replace(/\.md$/, '');
      const nowStr = new Date().toISOString();
      const stub: Omit<Ticket, 'description'> & { inBacklog?: boolean } = {
        id: uuidv4(), key, title: titleFallback,
        columnId: '', inBacklog: true,
        tagIds: [], order: tickets.length,
        createdAt: nowStr, updatedAt: nowStr,
      };
      const merged = applyFrontMatter(stub, fm, '', true);
      tickets.push({ ...merged, title: fm.title ?? titleFallback, description });
      trackedKeys.add(key);
      for (const c of parsedComments) {
        parsedCommentsList.push({ ...c, ticketId: merged.id });
      }
    }

    // Strip old isBacklog columns — backlog is now a ticket flag
    const migratedColumns = columns.filter(c => !c.isBacklog);

    // Merge comments: meta JSON is authoritative; fill gaps with anything parsed from .md files
    const metaComments: Comment[] = meta.comments ?? [];
    const metaCommentIds = new Set(metaComments.map(c => c.id));
    const mergedComments: Comment[] = [
      ...metaComments,
      ...parsedCommentsList
        .filter(c => !metaCommentIds.has(c.id))
        .map(c => ({ id: c.id, ticketId: c.ticketId, body: c.body, createdAt: c.createdAt, updatedAt: c.updatedAt })),
    ];

    return {
      schemaVersion: meta.schemaVersion ?? 1,
      columns: migratedColumns,
      epics,
      tags,
      tickets,
      trashedTickets: meta.trashedTickets ?? [],
      releasedEpics:  meta.releasedEpics  ?? [],
      templates:      meta.templates      ?? [],
      automationRules: meta.automationRules ?? [],
      comments:       mergedComments,
      linkedItems:    meta.linkedItems    ?? [],
      nextTicketNumber: meta.nextTicketNumber ?? 1,
      settings:       meta.settings       ?? { projectKey: 'TM' },
    };
  }

  async saveAll(state: AppState): Promise<void> {
    const { columns, epics, tags } = state;

    // Build a lookup of comments by ticketId for fast access
    const commentsByTicketId = new Map<string, Comment[]>();
    for (const comment of state.comments ?? []) {
      const list = commentsByTicketId.get(comment.ticketId) ?? [];
      list.push(comment);
      commentsByTicketId.set(comment.ticketId, list);
    }

    // Helper: write a ticket as a fully self-contained .md file with front matter
    const writeTicket = async (
      ticket: Ticket,
      folder: FileSystemDirectoryHandle,
    ) => {
      const ticketComments = commentsByTicketId.get(ticket.id) ?? [];
      const content = serializeTicketFile(ticket, columns, epics, tags, ticketComments);
      await this.writeTextFile(toFilename(ticket), content, folder);
    };

    // ── userStatus/<col>/ subfolders (board tickets) ─────────────────────────
    const colFolderHandles = new Map<string, FileSystemDirectoryHandle>();
    for (const col of columns) {
      colFolderHandles.set(col.id, await this.getColumnFolder(toFolderName(col)));
    }

    const activeColFiles = new Map<FileSystemDirectoryHandle, Set<string>>();
    for (const fh of colFolderHandles.values()) activeColFiles.set(fh, new Set());

    for (const ticket of state.tickets) {
      if (ticket.inBacklog) continue;
      const subfolder = colFolderHandles.get(ticket.columnId);
      if (!subfolder) continue;
      await writeTicket(ticket, subfolder);
      activeColFiles.get(subfolder)!.add(toFilename(ticket));
    }

    for (const [subfolder, active] of activeColFiles) {
      for (const name of await this.listMdInFolder(subfolder)) {
        if (!active.has(name)) await this.deleteFileFromFolder(name, subfolder);
      }
    }

    // ── _archive/Backlog/ ────────────────────────────────────────────────────
    const backlogFolder = await this.getArchiveSubfolder(BACKLOG_FOLDER);
    const activeBacklogFiles = new Set<string>();
    for (const ticket of state.tickets) {
      if (!ticket.inBacklog) continue;
      await writeTicket(ticket, backlogFolder);
      activeBacklogFiles.add(toFilename(ticket));
    }
    for (const name of await this.listMdInFolder(backlogFolder)) {
      if (!activeBacklogFiles.has(name)) await this.deleteFileFromFolder(name, backlogFolder);
    }

    // ── _archive/Deleted/ ────────────────────────────────────────────────────
    const deletedFolder = await this.getArchiveSubfolder(DELETED_FOLDER);
    const activeDeletedFiles = new Set<string>();
    for (const { ticket } of state.trashedTickets ?? []) {
      if (ticket.parentId) continue; // skip subtasks
      await writeTicket(ticket, deletedFolder);
      activeDeletedFiles.add(toFilename(ticket));
    }
    for (const name of await this.listMdInFolder(deletedFolder)) {
      if (!activeDeletedFiles.has(name)) await this.deleteFileFromFolder(name, deletedFolder);
    }

    // ── _archive/Released/<YYYYMMDD>/ ────────────────────────────────────────
    const releasedDateFolders = new Map<string, { fh: FileSystemDirectoryHandle; active: Set<string> }>();
    for (const release of state.releasedEpics ?? []) {
      const dateKey = toDateFolder(release.releasedAt);
      if (!releasedDateFolders.has(dateKey)) {
        releasedDateFolders.set(dateKey, {
          fh: await this.getReleasedDateFolder(release.releasedAt),
          active: new Set(),
        });
      }
      const { fh, active } = releasedDateFolders.get(dateKey)!;
      for (const ticket of release.tickets) {
        if (ticket.parentId) continue; // skip subtasks
        await writeTicket(ticket, fh);
        active.add(toFilename(ticket));
      }
    }
    for (const { fh, active } of releasedDateFolders.values()) {
      for (const name of await this.listMdInFolder(fh)) {
        if (!active.has(name)) await this.deleteFileFromFolder(name, fh);
      }
    }

    // ── _tasky_meta.json ─────────────────────────────────────────────────────
    // tickets array in meta keeps all fields EXCEPT description (that lives in the .md)
    const { tickets, ...rest } = state;
    const meta = {
      ...rest,
      _tickets: tickets.map(({ description: _d, ...t }) => t),
    };
    await this.writeTextFile(META_FILE, JSON.stringify(meta, null, 2));
  }
}

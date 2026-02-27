# Tasky

A local-first Kanban task manager that stores everything as Markdown files on your device. No server, no accounts, no cloud.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. On first load you will be prompted to choose a folder — Tasky reads and writes all data from there.

## Build for production

```bash
npm run build
npm run preview
```

## Install as desktop app

Tasky is a PWA. In Chrome or Edge, click the install icon in the address bar to add it to your dock/applications and run it as a standalone window.

---

## Features

### Board

- Kanban columns with drag-and-drop reordering of tickets
- Epic swimlanes — tickets grouped by epic across all columns
- "Other" swimlane for tickets not assigned to an epic
- Collapsible swimlanes
- Search tickets by title or key
- Filter by epic and/or tag (multi-select)
- Quick-create ticket button

### Backlog

- Separate staging area for tickets not yet on the board
- Drag tickets between Backlog and Board
- Epic progress strips: ticket count, % complete, visual progress bar
- Search across both board and backlog sections

### Epics

- Color-coded swimlane groupings
- Per-epic status: To Do / In Progress / Done
- Epic drawer: description, ticket list, progress percentage, column filter
- Release an epic once all its tickets are done — takes a permanent snapshot and moves it to the Releases archive
- Collapse/expand swimlanes individually

### Tickets

- Auto-generated key per project (e.g. `TM-1`)
- Priority levels: Lowest / Low / Medium / High / Highest
- Due date
- Rich-text description (Markdown)
- Tag assignment (multiple)
- Epic assignment
- Column (status) assignment
- Subtasks (one level deep) with their own priority, column, and progress tracking
- Linked items with relationship types: relates to, blocks / is blocked by, clones / is cloned by
- Comments (Sitrep) — add and delete notes on a ticket
- Full edit in ticket drawer

### Columns

- Create, rename, delete, and drag-reorder columns
- Optional color per column
- Optional role per column: **To Do**, **In Progress**, or **Done** — used for epic status calculation, default column on ticket creation, and auto-coloring

### Tags

- Create color-coded labels
- Assign multiple tags to any ticket
- Filter the board by tag
- Delete a tag removes it from all tickets

### Templates

- Save pre-configured ticket blueprints with default title, description, epic, priority, due date, tags, and subtasks
- Apply a template when creating a new ticket

### Releases

- Read-only archive of released epics
- Grouped by release date
- Search by epic name or ticket title/key
- Date range filter
- Shows all tickets that were in the epic at time of release

### Trash

- Soft-delete with 30-day retention
- Urgency indicators: red (≤ 3 days), yellow (≤ 7 days)
- Restore individual items or empty trash
- Subtasks are trashed and restored together with their parent

---

## Storage

### Markdown folder (recommended)

Each ticket is saved as a self-contained `.md` file with full YAML front matter:

```
<your folder>/
  _tasky_meta.json          ← columns, epics, tags, settings, …
  userStatus/               ← one subfolder per column
    Discovery/
      TM-3 · Design tokens.md
    Development/
      TM-5 · Build auth flow.md
  _archive/
    Backlog/
      TM-4 · Explore options.md
    Released/
      20260225/             ← YYYYMMDD of release date
        TM-1 · Set up repo.md
    Deleted/
      TM-9 · Old spike.md
```

Each `.md` file contains all ticket metadata as YAML front matter (id, key, title, status, epic, priority, tags, dates, order) and the description as Markdown body. Sitrep comments are appended as a `## Sitrep` section. Files are fully self-contained and readable in Obsidian, VS Code, or any Markdown app.

Requires Chrome or Edge (File System Access API).

### IndexedDB fallback

Used automatically as a transit state (e.g. between folder connections). No data is shown until a folder is connected.

---

## Settings

| Section | What you can do |
|---|---|
| Columns | Add, rename, reorder, color, and set role (To Do / In Progress / Done) |
| Storage | Connect or disconnect a Markdown folder |
| Backup | Export full JSON snapshot / Import JSON (replaces all data) |
| Danger zone | **Delete all data** — clears the folder, IndexedDB, and resets to a blank state |

---

## Export & import

1. **Settings → Storage & Data → Export JSON** — downloads `tasky-backup-YYYY-MM-DD.json`.
2. To restore, click **Import JSON** and select the file. Importing replaces all current data.

---

## Data model

| Entity | Key fields |
|---|---|
| `Column` | `id`, `name`, `order`, `role?`, `color?` |
| `Epic` | `id`, `title`, `color`, `status`, `order`, `isCollapsed` |
| `Tag` | `id`, `name`, `color` |
| `Ticket` | `id`, `key`, `title`, `description`, `columnId`, `inBacklog`, `epicId?`, `parentId?`, `tagIds`, `priority?`, `dueDate?`, `order` |
| `Comment` | `id`, `ticketId`, `body`, `createdAt`, `updatedAt` |
| `LinkedItem` | `id`, `ticketId`, `targetKey`, `targetTitle`, `relation` |
| `Template` | `id`, `name`, `defaultFields`, `defaultSubtasks` |
| `ReleasedEpic` | `epic` (snapshot), `tickets` (snapshot), `releasedAt` |
| `TrashedTicket` | `ticket` (snapshot), `trashedAt`, `expiresAt` |

All entities include `createdAt` and `updatedAt` ISO timestamps.

---

## Tech stack

| | |
|---|---|
| UI | React 19 + TypeScript |
| State | Zustand |
| Storage | File System Access API + Dexie (IndexedDB) |
| Drag-and-drop | @dnd-kit |
| Routing | React Router DOM v7 |
| Build | Vite 7 + vite-plugin-pwa (Workbox) |

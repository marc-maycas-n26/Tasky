# Tasky

A local-first Kanban task manager that stores everything as Markdown files on your device. No server, no accounts, no cloud.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5174. On first load you will be prompted to choose a folder — Tasky reads and writes all data from there.

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

- Kanban columns with drag-and-drop reordering of tickets between columns
- Epic swimlanes — tickets grouped by epic across all columns, drag-and-drop to reorder swimlanes
- "Other" swimlane for tickets not assigned to an epic
- Collapsible swimlanes
- Search tickets by title, key, or description content
- Filter by epic, label, and/or priority (multi-select)
- **Release** button — moves all done tickets to the Releases archive; shows last release date with weekday in the toolbar
- **Changelog** button — modal showing all activity since the last release, split into three sections: Done tickets, Updates (status changes and sitrep notes), and New tickets; entries expand by default
- Quick-create ticket button

### Backlog

- Separate staging area for tickets not yet on the board
- Drag tickets between Backlog and Board sections
- Epic progress strips: ticket count, % complete, visual progress bar
- Epics with no tickets still appear (unless explicitly marked done)
- Search across both board and backlog sections
- Filter by priority

### Epics

- Color-coded swimlane groupings
- Per-epic status: To Do / In Progress / Done (auto-computed or manually overridden)
- Epic drawer: description, ticket list, progress percentage, column filter
- Release an epic once all its tickets are done — takes a permanent snapshot and moves it to the Releases archive
- Collapse/expand swimlanes individually

### Tickets

- Auto-generated key per project (e.g. `TM-1`)
- Priority levels: Lowest / Low / Medium / High / Highest — defaults to Medium on creation
- Due date
- Rich-text description with bold, italic, headings, lists, code, blockquotes, task lists, links, images, and emoji
- Tag (label) assignment — multiple per ticket
- Epic assignment
- Column (status) assignment
- Subtasks — nested tickets up to one level deep
- Linked items with relationship types: relates to, blocks / is blocked by, clones / is cloned by
- Sitrep (activity section) — rich-text comments with automatic system events for column changes; sortable oldest/newest; editable and deletable
- Created and updated timestamps shown with date and time (HH:MM)
- Full edit in ticket drawer
- "Create & New" — create a ticket and immediately open a fresh form to add another

### Columns

- Create, rename, delete, and drag-reorder columns
- Optional color per column
- Optional role per column: **To Do**, **In Progress**, or **Done** — used for epic status calculation, default column on ticket creation, and release detection

### Labels (Tags)

- Create color-coded labels with inline swatch and color picker
- Assign multiple labels to any ticket or epic
- Filter the board by label
- Dedicated Labels page for management
- Delete a label removes it from all tickets and epics

### Templates

- Save pre-configured ticket blueprints with default title, description, priority, due date, and tags
- Apply a template when creating a new ticket

### Releases

- Release all done tickets from the board in one click — groups them by epic, shows a confirmation dialog with the full ticket list before committing
- Read-only archive of released epics grouped by release date
- Search by epic name or ticket title, key, or description
- Date range filter
- Shows all tickets that were in the epic at time of release with their tags

### Changelog

- Accessible from the board toolbar — shows everything that happened since the last release (or all-time if no releases yet)
- **Done** — tickets currently in a done column
- **Updates** — existing tickets with status changes or sitrep notes since the last release, with a timestamped timeline per ticket
- **New tickets** — tickets created after the last release
- All entries anchored to the exact release timestamp (date + time), so same-day changes after a release are correctly included

### Trash

- Soft-delete with 30-day retention
- Urgency indicators: red (≤ 3 days), yellow (≤ 7 days)
- Restore individual items or empty trash

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
| `Ticket` | `id`, `key`, `title`, `description`, `columnId`, `inBacklog`, `epicId?`, `tagIds`, `priority`, `dueDate?`, `order` |
| `Comment` | `id`, `ticketId`, `body`, `createdAt`, `updatedAt`, `isSystem?` |
| `LinkedItem` | `id`, `ticketId`, `targetKey`, `targetTitle`, `relation` |
| `Template` | `id`, `name`, `defaultFields` |
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
| Rich text | TipTap |
| Drag-and-drop | @dnd-kit |
| Routing | React Router DOM v7 |
| Build | Vite 7 + vite-plugin-pwa (Workbox) |

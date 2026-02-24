# Antigravity Task Manager

A self-hosted Kanban board with drag-and-drop, epics, subtasks, tags, and optional Google Drive sync.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. Seed data loads automatically on first run.

## Build for production

```bash
npm run build
npm run preview
```

## Features

- **Board** — Kanban columns with drag-and-drop, swimlane groupings by epic
- **Epics** — Color-coded swimlanes; collapse/expand per epic
- **Tickets** — Priority, story-point estimates, due dates, subtasks, tags
- **Templates** — Pre-configured ticket blueprints with default subtasks
- **Tags** — Reusable color labels
- **Settings** — Manage columns (CRUD + reorder + WIP limits), epics (CRUD + reorder), project key
- **Export / Import** — Full JSON snapshots for backup or migration
- **Google Drive sync** — Optional OAuth2 cloud storage

## Export & Import

1. Go to **Settings → Storage & Data**.
2. Click **Export JSON** — downloads `antigravity-tasks-<date>.json`.
3. To restore, click **Import JSON** and select the file.
   *Importing replaces all current data.*

## Google Drive setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Google Drive API**.
3. Create an **OAuth 2.0 Client ID** (type: *Web application*).
4. Add your dev origin (e.g. `http://localhost:5173`) to **Authorized JavaScript origins**.
5. Create `.env.local` in the project root:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

6. Restart `npm run dev`, then go to **Settings → Storage & Data → Connect Google Drive**.

Data is stored as `antigravity-tasks.json` in the user's Drive root. On reconnect, the same file is reused.

## Data model

| Entity | Key fields |
|---|---|
| `Column` | `id`, `name`, `order`, `isBacklog`, `isTodo`, `wipLimit?` |
| `Epic` | `id`, `title`, `color`, `order`, `isCollapsed` |
| `Tag` | `id`, `name`, `color` |
| `Ticket` | `id`, `key` (e.g. TM-1), `title`, `description`, `columnId`, `epicId?`, `parentId?`, `tagIds`, `priority?`, `estimate?`, `dueDate?`, `order` |
| `Template` | `id`, `name`, `defaultFields`, `defaultSubtasks` |

All entities include `createdAt` and `updatedAt` ISO timestamps.

## Storage

Data is persisted in **IndexedDB** (`antigravity-tasks` database via Dexie) by default — no server required. The Google Drive adapter is a drop-in replacement using the same `StorageAdapter` interface.

## Tech stack

| | |
|---|---|
| UI | React 19 + TypeScript |
| State | Zustand |
| Storage | Dexie (IndexedDB) + Google Drive API |
| Drag-and-drop | @dnd-kit |
| Routing | React Router DOM v7 |
| Build | Vite 7 |

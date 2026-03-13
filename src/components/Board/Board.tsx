import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { useStore } from '../../store';
import { BoardColumn } from './BoardColumn';
import { FilterDropdown } from './FilterDropdown';
import { SwimlaneEpicHeader } from './SwimlaneEpicHeader';
import { TicketCard } from '../Ticket/TicketCard';
import { TicketDrawer } from '../Ticket/TicketDrawer';
import { EpicDrawer } from '../Epic/EpicDrawer';
import { CreateTicketModal } from '../Ticket/CreateTicketModal';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import type { Ticket, Epic, Comment, Column, ReleasedEpic } from '../../types';
import { PRIORITIES, PRIORITY_COLORS } from '../../constants/priorities';
import './Board.css';

export function Board() {
  const columns = useStore(s => s.columns);
  const epics = useStore(s => s.epics);
  const tickets = useStore(s => s.tickets);
  const tags = useStore(s => s.tags);
  const moveTicket = useStore(s => s.moveTicket);
  const reorderTickets = useStore(s => s.reorderTickets);
  const isTicketDrawerOpen = useStore(s => s.isTicketDrawerOpen);
  const isEpicDrawerOpen = useStore(s => s.isEpicDrawerOpen);
  const isCreateTicketOpen = useStore(s => s.isCreateTicketOpen);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const releaseDoneTickets = useStore(s => s.releaseDoneTickets);
  const reorderEpics = useStore(s => s.reorderEpics);
  const releasedEpics = useStore(s => s.releasedEpics);
  const comments = useStore(s => s.comments);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [overEpicId, setOverEpicId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [epicFilter, setEpicFilter] = useState<Set<string>>(new Set());
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [otherCollapsed, setOtherCollapsed] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [nothingToRelease, setNothingToRelease] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order).filter(c => !c.isBacklog),
    [columns]
  );

  const sortedEpics = useMemo(
    () => [...epics].sort((a, b) => a.order - b.order),
    [epics]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function toggleEpicFilter(id: string) {
    setEpicFilter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleLabelFilter(id: string) {
    setLabelFilter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePriorityFilter(id: string) {
    setPriorityFilter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.key?.toLowerCase().includes(q) ||
        (t.description ?? '').replace(/<[^>]*>/g, ' ').toLowerCase().includes(q)
      );
    }
    if (epicFilter.size > 0) {
      result = result.filter(t => t.epicId && epicFilter.has(t.epicId));
    }
    if (labelFilter.size > 0) {
      result = result.filter(t => t.tagIds.some(tid => labelFilter.has(tid)));
    }
    if (priorityFilter.size > 0) {
      result = result.filter(t => priorityFilter.has(t.priority ?? ''));
    }
    return result;
  }, [tickets, search, epicFilter, labelFilter, priorityFilter]);

  function handleDragStart(e: DragStartEvent) {
    if (e.active.data.current?.type === 'epic') {
      setActiveEpicId(e.active.id as string);
    } else {
      const ticket = tickets.find(t => t.id === e.active.id);
      setActiveTicket(ticket ?? null);
    }
  }

  function handleDragOver(e: DragOverEvent) {
    if (e.active.data.current?.type === 'epic') {
      setOverEpicId(e.over ? e.over.id as string : null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;

    if (active.data.current?.type === 'epic') {
      setActiveEpicId(null);
      setOverEpicId(null);
      if (!over || active.id === over.id) return;
      const oldIndex = sortedEpics.findIndex(ep => ep.id === active.id);
      const newIndex = sortedEpics.findIndex(ep => ep.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(sortedEpics, oldIndex, newIndex);
      reorderEpics(reordered.map(ep => ep.id));
      return;
    }

    setActiveTicket(null);
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    const colEpicMatch = overId.match(/^col-(.+)-epic-(.+)$/);
    if (colEpicMatch) {
      const [, targetColId, epicPart] = colEpicMatch;
      const targetEpicId = epicPart === 'null' ? undefined : epicPart;
      const colTickets = tickets
        .filter(t => t.columnId === targetColId && (t.epicId ?? 'null') === (targetEpicId ?? 'null'))
        .sort((a, b) => a.order - b.order);
      moveTicket(draggedId, targetColId, targetEpicId, colTickets.length);
      return;
    }

    const overTicket = tickets.find(t => t.id === overId);
    if (overTicket && draggedId !== overId) {
      const targetColId = overTicket.columnId;
      const targetEpicId = overTicket.epicId;
      const colTickets = tickets
        .filter(t => t.columnId === targetColId && (t.epicId ?? null) === (targetEpicId ?? null))
        .sort((a, b) => a.order - b.order);

      const withoutDragged = colTickets.filter(t => t.id !== draggedId);
      const overIdx = withoutDragged.findIndex(t => t.id === overId);
      const insertIdx = overIdx === -1 ? withoutDragged.length : overIdx;
      const dragged = tickets.find(t => t.id === draggedId)!;
      withoutDragged.splice(insertIdx, 0, dragged);
      reorderTickets(targetColId, targetEpicId, withoutDragged.map(t => t.id));

      if (dragged.columnId !== targetColId || dragged.epicId !== targetEpicId) {
        moveTicket(draggedId, targetColId, targetEpicId, insertIdx);
      }
    }
  }

  const epicGroups = useMemo(() => {
    const top = filteredTickets.filter(t => t.inBacklog !== true && !!t.columnId);
    const noEpicTickets = top.filter(t => !t.epicId);
    return [
      ...sortedEpics.map(epic => ({
        epic,
        tickets: top.filter(t => t.epicId === epic.id),
      })).filter(g => g.tickets.length > 0),
      ...(noEpicTickets.length > 0 ? [{ epic: null as Epic | null, tickets: noEpicTickets }] : []),
    ];
  }, [sortedEpics, filteredTickets]);

  const epicOptions = sortedEpics.map(e => ({ id: e.id, name: e.title, color: e.color ?? undefined }));
  const labelOptions = tags.map(t => ({ id: t.id, name: t.name, color: t.color }));
  const priorityOptions = PRIORITIES.map(p => ({ id: p, name: p.charAt(0).toUpperCase() + p.slice(1), color: PRIORITY_COLORS[p] }));

  const doneColIds = useMemo(() => new Set(
    columns
      .filter(c => c.role === 'done' || c.name.toLowerCase() === 'done')
      .map(c => c.id)
  ), [columns]);

  const doneTickets = useMemo(
    () => tickets.filter(t => !t.inBacklog && doneColIds.has(t.columnId)),
    [tickets, doneColIds]
  );
  const doneCount = doneTickets.length;

  const lastReleaseDate = useMemo(() => {
    if (releasedEpics.length === 0) return null;
    const latest = releasedEpics.reduce((a, b) => a.releasedAt > b.releasedAt ? a : b);
    return new Date(latest.releasedAt);
  }, [releasedEpics]);

  const lastReleaseLabel = useMemo(() => {
    if (!lastReleaseDate) return null;
    // Compare by natural calendar week (Mon–Sun). Get the Monday of each date's week.
    const startOfWeek = (d: Date) => {
      const day = d.getDay(); // 0=Sun, 1=Mon…
      const diff = (day === 0 ? -6 : 1 - day); // days to subtract to reach Monday
      const mon = new Date(d);
      mon.setHours(0, 0, 0, 0);
      mon.setDate(d.getDate() + diff);
      return mon;
    };
    const nowWeek = startOfWeek(new Date());
    const releaseWeek = startOfWeek(lastReleaseDate);
    const weeks = Math.round((nowWeek.getTime() - releaseWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeks === 0) return 'Released this week';
    if (weeks === 1) return 'Released last week';
    return `Released ${weeks} weeks ago`;
  }, [lastReleaseDate]);

  const lastReleaseDateLabel = useMemo(() => {
    if (!lastReleaseDate) return null;
    const weekday = lastReleaseDate.toLocaleDateString(undefined, { weekday: 'short' });
    const day = String(lastReleaseDate.getDate()).padStart(2, '0');
    const month = String(lastReleaseDate.getMonth() + 1).padStart(2, '0');
    const year = lastReleaseDate.getFullYear();
    return `${weekday} - ${day}.${month}.${year}`;
  }, [lastReleaseDate]);

  function handleReleaseClick() {
    if (doneCount === 0) { setNothingToRelease(true); return; }
    setConfirmRelease(true);
  }

  return (
    <div className="board-root">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Toolbar — outside the scroll container so it never scrolls */}
        <div className="board-toolbar">
          <div className="board-search">
            <span className="board-search-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              className="board-search-input"
              placeholder="Search board"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="board-toolbar-sep" />

          <FilterDropdown
            label="Epic"
            options={epicOptions}
            selected={epicFilter}
            onToggle={toggleEpicFilter}
          />

          <FilterDropdown
            label="Label"
            options={labelOptions}
            selected={labelFilter}
            onToggle={toggleLabelFilter}
          />

          <FilterDropdown
            label="Priority"
            options={priorityOptions}
            selected={priorityFilter}
            onToggle={togglePriorityFilter}
          />

          {(epicFilter.size > 0 || labelFilter.size > 0 || priorityFilter.size > 0) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setEpicFilter(new Set()); setLabelFilter(new Set()); setPriorityFilter(new Set()); }}
            >
              Clear filters
            </button>
          )}

          <div className="board-toolbar-right">
            {lastReleaseLabel && (
              <span className="board-last-release">
                {lastReleaseLabel}{lastReleaseDateLabel && ` (${lastReleaseDateLabel})`}
              </span>
            )}
            <button className="btn btn-secondary" onClick={() => setChangelogOpen(true)} title="View changes since last release">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Changelog
            </button>
            <button className="btn btn-secondary" onClick={handleReleaseClick} title="Release all done tickets">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M7 1.5C4 1.5 1.5 4 1.5 7S4 12.5 7 12.5 12.5 10 12.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M9.5 1.5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.5 1.5L7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Release
              {doneCount > 0 && <span className="board-release-badge">{doneCount}</span>}
            </button>
            <button className="btn btn-primary" onClick={() => openCreateTicket({})}>
              + Create issue
            </button>
          </div>
        </div>
          <SortableContext
            items={sortedEpics.map(ep => ep.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="board-swimlanes">
              {epicGroups.map(({ epic, tickets: groupTickets }) => {
                const isCollapsed = epic ? epic.isCollapsed : otherCollapsed;
                if (!epic) {
                  return (
                    <div key="__other__" className="swimlane">
                      <SwimlaneEpicHeader
                        epic={null}
                        tickets={groupTickets}
                        columns={columns}
                        tags={tags}
                        isCollapsedOverride={otherCollapsed}
                        onToggleOther={() => setOtherCollapsed(c => !c)}
                      />
                      {!isCollapsed && (
                        <div className="swimlane-cols-scroll">
                          <div className="swimlane-cols-row">
                            {sortedColumns.map(col => (
                              <BoardColumn
                                key={col.id}
                                column={col}
                                epicId={undefined}
                                tickets={groupTickets
                                  .filter(t => t.columnId === col.id)
                                  .sort((a, b) => a.order - b.order)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <SortableSwimlane key={epic.id} epicId={epic.id} isOver={overEpicId === epic.id && activeEpicId !== epic.id}>
                    {dragHandleProps => (
                      <>
                        <SwimlaneEpicHeader
                          epic={epic}
                          tickets={groupTickets}
                          columns={columns}
                          tags={tags}
                          dragHandleProps={dragHandleProps}
                        />
                        {!isCollapsed && (
                          <div className="swimlane-cols-scroll">
                            <div className="swimlane-cols-row">
                              {sortedColumns.map(col => (
                                <BoardColumn
                                  key={col.id}
                                  column={col}
                                  epicId={epic.id}
                                  tickets={groupTickets
                                    .filter(t => t.columnId === col.id)
                                    .sort((a, b) => a.order - b.order)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </SortableSwimlane>
                );
              })}
            </div>
          </SortableContext>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeEpicId ? (
            <EpicDragGhost epic={sortedEpics.find(ep => ep.id === activeEpicId)!} />
          ) : activeTicket ? (
            <TicketCard ticket={activeTicket} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isTicketDrawerOpen && <TicketDrawer />}
      {isEpicDrawerOpen && <EpicDrawer />}
      {isCreateTicketOpen && <CreateTicketModal />}

      {confirmRelease && (
        <ReleaseConfirmDialog
          tickets={doneTickets}
          epics={sortedEpics}
          onConfirm={() => { releaseDoneTickets(); setConfirmRelease(false); }}
          onCancel={() => setConfirmRelease(false)}
        />
      )}

      {nothingToRelease && (
        <ConfirmDialog
          title="Nothing to release"
          message="There are no tickets in a Done column. Move tickets to Done before releasing."
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={() => setNothingToRelease(false)}
          onCancel={() => setNothingToRelease(false)}
        />
      )}

      {changelogOpen && (
        <ChangelogDialog
          tickets={tickets}
          comments={comments}
          columns={columns}
          releasedEpics={releasedEpics}
          epics={sortedEpics}
          onClose={() => setChangelogOpen(false)}
        />
      )}
    </div>
  );
}

// ── Sortable swimlane wrapper ──────────────────────────────────────────────────

type DragHandleProps = {
  ref: (el: HTMLElement | null) => void;
  listeners: ReturnType<typeof useSortable>['listeners'];
  attributes: ReturnType<typeof useSortable>['attributes'];
};

function SortableSwimlane({
  epicId,
  isOver,
  children,
}: {
  epicId: string;
  isOver: boolean;
  children: (dragHandleProps: DragHandleProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useSortable({ id: epicId, data: { type: 'epic' } });

  return (
    <div
      ref={setNodeRef}
      className={`swimlane${isOver ? ' swimlane--drop-target' : ''}`}
      style={{ opacity: isDragging ? 0 : undefined }}
    >
      {children({ ref: setActivatorNodeRef, listeners, attributes })}
    </div>
  );
}

// ── Release confirm dialog ────────────────────────────────────────────────────

function ReleaseConfirmDialog({
  tickets,
  epics,
  onConfirm,
  onCancel,
}: {
  tickets: Ticket[];
  epics: Epic[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const epicMap = new Map(epics.map(e => [e.id, e]));

  // Group tickets by epic (preserving epic order, ungrouped at the end)
  const groups: { epic: Epic | null; tickets: Ticket[] }[] = [];
  const seen = new Set<string | undefined>();
  for (const epic of epics) {
    const group = tickets.filter(t => t.epicId === epic.id);
    if (group.length > 0) {
      groups.push({ epic, tickets: group });
      seen.add(epic.id);
    }
  }
  const noEpic = tickets.filter(t => !seen.has(t.epicId));
  if (noEpic.length > 0) groups.push({ epic: null, tickets: noEpic });

  return (
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="release-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="release-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="release-dialog-header">
          <h3 className="release-dialog-title" id="release-dialog-title">Release done tickets?</h3>
          <p className="release-dialog-subtitle">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} will be moved to the Releases archive and removed from the board. This cannot be undone.
          </p>
        </div>

        <div className="release-dialog-body">
          {groups.map((group, i) => (
            <div key={group.epic?.id ?? 'no-epic'} className={`bl-epic-group${i === 0 ? ' bl-epic-group--first' : ''}`}>
              <div className="bl-epic-group-header release-dialog-group-header" style={group.epic ? { borderLeftColor: group.epic.color } : undefined}>
                {group.epic ? (
                  <>
                    <span className="bl-epic-group-icon">
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2.5 1.5h9a1 1 0 011 1v10l-5.5-2.75L1.5 12.5v-10a1 1 0 011-1z" fill={group.epic.color}/>
                      </svg>
                    </span>
                    <span className="bl-epic-group-title" style={{ color: group.epic.color }}>{group.epic.title}</span>
                  </>
                ) : (
                  <span className="bl-epic-group-title bl-epic-group-title--none">No epic</span>
                )}
                <span className="bl-epic-group-count">{group.tickets.length}</span>
              </div>
              {group.tickets.map(t => (
                <div key={t.id} className="bl-row bl-row--indented release-dialog-ticket-row">
                  <span className="bl-row-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
                      <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span className="bl-row-key">{t.key}</span>
                  <span className="bl-row-title">{t.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="release-dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} autoFocus>Release</button>
        </div>
      </div>
    </div>
  );
}

// ── Changelog dialog ──────────────────────────────────────────────────────────

type ChangelogEntry = { type: 'status' | 'sitrep'; body: string; at: string };

interface ChangelogTicketRow {
  ticket: Ticket;
  entries: ChangelogEntry[];
}

function ChangelogDialog({
  tickets,
  comments,
  columns,
  releasedEpics,
  epics,
  onClose,
}: {
  tickets: Ticket[];
  comments: Comment[];
  columns: Column[];
  releasedEpics: ReleasedEpic[];
  epics: Epic[];
  onClose: () => void;
}) {
  // Anchor: the most recent releasedAt, or epoch if no releases
  const sinceTs = useMemo(() => {
    if (releasedEpics.length === 0) return new Date(0).toISOString();
    return releasedEpics.reduce((a, b) => a.releasedAt > b.releasedAt ? a : b).releasedAt;
  }, [releasedEpics]);

  const sinceDate = new Date(sinceTs);
  const hasReleases = releasedEpics.length > 0;

  const colMap = useMemo(() => new Map(columns.map(c => [c.id, c])), [columns]);
  const epicMap = useMemo(() => new Map(epics.map(e => [e.id, e])), [epics]);

  // Split into done / updated / new tickets since the anchor
  const { doneTickets, changedTickets, newTickets } = useMemo(() => {
    const done: ChangelogTicketRow[] = [];
    const changed: ChangelogTicketRow[] = [];
    const newT: Ticket[] = [];

    const doneColIds = new Set(
      columns
        .filter(c => c.role === 'done' || c.name.toLowerCase() === 'done')
        .map(c => c.id)
    );

    for (const ticket of tickets) {
      if (ticket.inBacklog) continue;
      const isNew = new Date(ticket.createdAt) > sinceDate;
      const isDone = doneColIds.has(ticket.columnId);

      const entries: ChangelogEntry[] = comments
        .filter(c => c.ticketId === ticket.id && new Date(c.createdAt) > sinceDate)
        .map(c => ({ type: c.isSystem ? 'status' : 'sitrep', body: c.body, at: c.createdAt }));
      entries.sort((a, b) => a.at.localeCompare(b.at));

      if (isDone) {
        done.push({ ticket, entries });
      } else if (isNew) {
        newT.push(ticket);
      } else if (entries.length > 0) {
        changed.push({ ticket, entries });
      }
    }

    done.sort((a, b) => {
      const aLast = a.entries.length > 0 ? a.entries[a.entries.length - 1].at : a.ticket.updatedAt;
      const bLast = b.entries.length > 0 ? b.entries[b.entries.length - 1].at : b.ticket.updatedAt;
      return bLast.localeCompare(aLast);
    });
    changed.sort((a, b) => {
      const aLast = a.entries[a.entries.length - 1].at;
      const bLast = b.entries[b.entries.length - 1].at;
      return bLast.localeCompare(aLast);
    });
    newT.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { doneTickets: done, changedTickets: changed, newTickets: newT };
  }, [tickets, comments, columns, sinceDate]);

  // Default-expand all changed and done tickets
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    new Set([...doneTickets.map(r => r.ticket.id), ...changedTickets.map(r => r.ticket.id)])
  );

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function formatTs(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  // Render a system comment body: replace **text** with <strong>
  function renderBody(body: string) {
    const parts = body.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p
    );
  }

  const sinceLabel = hasReleases
    ? `Since release on ${sinceDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${sinceDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : 'All activity (no releases yet)';

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div
        className="changelog-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="changelog-dialog-header">
          <div className="changelog-dialog-title-row">
            <h3 className="changelog-dialog-title" id="changelog-dialog-title">Changelog</h3>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <p className="changelog-dialog-subtitle">{sinceLabel}</p>
        </div>

        <div className="changelog-dialog-body">
          {doneTickets.length === 0 && changedTickets.length === 0 && newTickets.length === 0 ? (
            <div className="changelog-empty">No changes since the last release.</div>
          ) : (
            <>
              {doneTickets.length > 0 && (
                <div className="changelog-section">
                  <div className="changelog-section-header">
                    Done
                    <span className="changelog-section-count">{doneTickets.length}</span>
                  </div>
                  {doneTickets.map(({ ticket, entries }) => {
                    const isExpanded = expandedIds.has(ticket.id);
                    const col = colMap.get(ticket.columnId);
                    const epic = ticket.epicId ? epicMap.get(ticket.epicId) : undefined;
                    return (
                      <div key={ticket.id} className="changelog-ticket">
                        <div
                          className="changelog-ticket-row"
                          onClick={() => entries.length > 0 && toggleExpand(ticket.id)}
                          style={{ cursor: entries.length > 0 ? 'pointer' : 'default' }}
                        >
                          <span className="changelog-ticket-toggle">
                            {entries.length > 0
                              ? isExpanded
                                ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4H2z" fill="currentColor"/></svg>
                                : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3V2z" fill="currentColor"/></svg>
                              : <span style={{ display: 'inline-block', width: 10 }} />
                            }
                          </span>
                          <span className="changelog-ticket-key">{ticket.key}</span>
                          <span className="changelog-ticket-title">{ticket.title}</span>
                          <div className="changelog-ticket-meta">
                            {col && (
                              <span className="changelog-badge changelog-badge--done">{col.name}</span>
                            )}
                            {epic && (
                              <span className="changelog-badge changelog-badge--epic" style={{ color: epic.color ?? 'var(--color-text-subtle)' }}>
                                {epic.title}
                              </span>
                            )}
                            {entries.length > 0 && (
                              <span className="changelog-entry-count">
                                {entries.length} update{entries.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded && entries.length > 0 && (
                          <div className="changelog-entries">
                            {entries.map((entry, i) => (
                              <div key={i} className={`changelog-entry changelog-entry--${entry.type}`}>
                                <span className="changelog-entry-dot" />
                                {entry.type === 'sitrep'
                                  ? <span className="changelog-entry-body rte-content" dangerouslySetInnerHTML={{ __html: entry.body }} />
                                  : <span className="changelog-entry-body">{renderBody(entry.body)}</span>
                                }
                                <span className="changelog-entry-time">{formatTs(entry.at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {changedTickets.length > 0 && (
                <div className="changelog-section">
                  <div className="changelog-section-header">
                    Updates
                    <span className="changelog-section-count">{changedTickets.length}</span>
                  </div>
                  {changedTickets.map(({ ticket, entries }) => {
                    const isExpanded = expandedIds.has(ticket.id);
                    const col = colMap.get(ticket.columnId);
                    const epic = ticket.epicId ? epicMap.get(ticket.epicId) : undefined;
                    return (
                      <div key={ticket.id} className="changelog-ticket">
                        <div
                          className="changelog-ticket-row"
                          onClick={() => toggleExpand(ticket.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="changelog-ticket-toggle">
                            {isExpanded
                              ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4H2z" fill="currentColor"/></svg>
                              : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3V2z" fill="currentColor"/></svg>
                            }
                          </span>
                          <span className="changelog-ticket-key">{ticket.key}</span>
                          <span className="changelog-ticket-title">{ticket.title}</span>
                          <div className="changelog-ticket-meta">
                            {col && (
                              <span className="changelog-badge changelog-badge--col" style={col.color ? { background: col.color + '22', color: col.color, borderColor: col.color + '55' } : undefined}>
                                {col.name}
                              </span>
                            )}
                            {epic && (
                              <span className="changelog-badge changelog-badge--epic" style={{ color: epic.color ?? 'var(--color-text-subtle)' }}>
                                {epic.title}
                              </span>
                            )}
                            <span className="changelog-entry-count">
                              {entries.length} update{entries.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="changelog-entries">
                            {entries.map((entry, i) => (
                              <div key={i} className={`changelog-entry changelog-entry--${entry.type}`}>
                                <span className="changelog-entry-dot" />
                                {entry.type === 'sitrep'
                                  ? <span className="changelog-entry-body rte-content" dangerouslySetInnerHTML={{ __html: entry.body }} />
                                  : <span className="changelog-entry-body">{renderBody(entry.body)}</span>
                                }
                                <span className="changelog-entry-time">{formatTs(entry.at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {newTickets.length > 0 && (
                <div className="changelog-section">
                  <div className="changelog-section-header">
                    New tickets
                    <span className="changelog-section-count">{newTickets.length}</span>
                  </div>
                  {newTickets.map(ticket => {
                    const col = colMap.get(ticket.columnId);
                    const epic = ticket.epicId ? epicMap.get(ticket.epicId) : undefined;
                    return (
                      <div key={ticket.id} className="changelog-ticket">
                        <div className="changelog-ticket-row" style={{ cursor: 'default' }}>
                          <span style={{ display: 'inline-block', width: 10, flexShrink: 0 }} />
                          <span className="changelog-ticket-key">{ticket.key}</span>
                          <span className="changelog-ticket-title">{ticket.title}</span>
                          <div className="changelog-ticket-meta">
                            {col && (
                              <span className="changelog-badge changelog-badge--col" style={col.color ? { background: col.color + '22', color: col.color, borderColor: col.color + '55' } : undefined}>
                                {col.name}
                              </span>
                            )}
                            {epic && (
                              <span className="changelog-badge changelog-badge--epic" style={{ color: epic.color ?? 'var(--color-text-subtle)' }}>
                                {epic.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Lightweight ghost shown in the DragOverlay during swimlane drag
function EpicDragGhost({ epic }: { epic: Epic }) {
  return (
    <div className="swimlane-drag-ghost">
      <span className="swimlane-epic-icon" style={{ color: epic.color ?? '#8993A4' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.5 1.5h9a1 1 0 011 1v10l-5.5-2.75L1.5 12.5v-10a1 1 0 011-1z" fill={epic.color ?? '#FFAB00'} />
        </svg>
      </span>
      <span className="swimlane-epic-title">{epic.title}</span>
    </div>
  );
}

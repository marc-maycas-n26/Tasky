import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useStore } from '../../store';
import { BoardColumn } from './BoardColumn';
import { FilterDropdown } from './FilterDropdown';
import { SwimlaneEpicHeader } from './SwimlaneEpicHeader';
import { TicketCard } from '../Ticket/TicketCard';
import { TicketDrawer } from '../Ticket/TicketDrawer';
import { EpicDrawer } from '../Epic/EpicDrawer';
import { CreateTicketModal } from '../Ticket/CreateTicketModal';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import type { Ticket, Epic } from '../../types';
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
  const releasedEpics = useStore(s => s.releasedEpics);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [search, setSearch] = useState('');
  const [epicFilter, setEpicFilter] = useState<Set<string>>(new Set());
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());
  const [otherCollapsed, setOtherCollapsed] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [nothingToRelease, setNothingToRelease] = useState(false);

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

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) || t.key?.toLowerCase().includes(q)
      );
    }
    if (epicFilter.size > 0) {
      result = result.filter(t => t.epicId && epicFilter.has(t.epicId));
    }
    if (labelFilter.size > 0) {
      result = result.filter(t => t.tagIds.some(tid => labelFilter.has(tid)));
    }
    return result;
  }, [tickets, search, epicFilter, labelFilter]);

  function handleDragStart(e: DragStartEvent) {
    const ticket = tickets.find(t => t.id === e.active.id);
    setActiveTicket(ticket ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTicket(null);
    const { active, over } = e;
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    const colEpicMatch = overId.match(/^col-(.+)-epic-(.+)$/);
    if (colEpicMatch) {
      const [, targetColId, epicPart] = colEpicMatch;
      const targetEpicId = epicPart === 'null' ? undefined : epicPart;
      const colTickets = tickets
        .filter(t => t.columnId === targetColId && (t.epicId ?? 'null') === (targetEpicId ?? 'null') && !t.parentId)
        .sort((a, b) => a.order - b.order);
      moveTicket(draggedId, targetColId, targetEpicId, colTickets.length);
      return;
    }

    const overTicket = tickets.find(t => t.id === overId);
    if (overTicket && draggedId !== overId) {
      const targetColId = overTicket.columnId;
      const targetEpicId = overTicket.epicId;
      const colTickets = tickets
        .filter(t => t.columnId === targetColId && (t.epicId ?? null) === (targetEpicId ?? null) && !t.parentId)
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
    const top = filteredTickets.filter(t => !t.parentId && t.inBacklog !== true && !!t.columnId);
    const noEpicTickets = top.filter(t => !t.epicId);
    return [
      ...sortedEpics.map(epic => ({
        epic,
        tickets: top.filter(t => t.epicId === epic.id),
      })).filter(g => g.tickets.length > 0),
      ...(noEpicTickets.length > 0 ? [{ epic: null as Epic | null, tickets: noEpicTickets }] : []),
    ];
  }, [sortedEpics, filteredTickets, columns]);

  const epicOptions = sortedEpics.map(e => ({ id: e.id, name: e.title, color: e.color ?? undefined }));
  const labelOptions = tags.map(t => ({ id: t.id, name: t.name, color: t.color }));

  const doneColIds = useMemo(() => new Set(
    columns
      .filter(c => c.role === 'done' || c.name.toLowerCase() === 'done')
      .map(c => c.id)
  ), [columns]);

  const doneCount = useMemo(
    () => tickets.filter(t => !t.inBacklog && !t.parentId && doneColIds.has(t.columnId)).length,
    [tickets, doneColIds]
  );

  const lastReleaseDate = useMemo(() => {
    if (releasedEpics.length === 0) return null;
    const latest = releasedEpics.reduce((a, b) => a.releasedAt > b.releasedAt ? a : b);
    return new Date(latest.releasedAt);
  }, [releasedEpics]);

  const lastReleaseLabel = useMemo(() => {
    if (!lastReleaseDate) return null;
    const weeks = Math.floor((Date.now() - lastReleaseDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeks === 0) return 'Released this week';
    if (weeks === 1) return '1 week ago';
    return `${weeks} weeks ago`;
  }, [lastReleaseDate]);

  const lastReleaseDateLabel = useMemo(() => {
    if (!lastReleaseDate) return null;
    return lastReleaseDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }, [lastReleaseDate]);

  function handleReleaseClick() {
    if (doneCount === 0) { setNothingToRelease(true); return; }
    setConfirmRelease(true);
  }

  return (
    <div className="board-root">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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

          {(epicFilter.size > 0 || labelFilter.size > 0) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setEpicFilter(new Set()); setLabelFilter(new Set()); }}
            >
              Clear filters
            </button>
          )}

          <div className="board-toolbar-right">
            {lastReleaseLabel && (
              <span className="board-last-release" title={lastReleaseDateLabel ?? undefined}>
                {lastReleaseLabel}
              </span>
            )}
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
        <div className="board-swimlanes">
          {epicGroups.map(({ epic, tickets: groupTickets }) => {
            const isCollapsed = epic ? epic.isCollapsed : otherCollapsed;
            return (
              <div key={epic?.id ?? '__other__'} className="swimlane">
                <SwimlaneEpicHeader
                  epic={epic}
                  tickets={groupTickets}
                  columns={columns}
                  tags={tags}
                  isCollapsedOverride={epic ? undefined : otherCollapsed}
                  onToggleOther={epic ? undefined : () => setOtherCollapsed(c => !c)}
                />

                {!isCollapsed && (
                  <div className="swimlane-cols-scroll">
                    <div className="swimlane-cols-row">
                      {sortedColumns.map(col => (
                        <BoardColumn
                          key={col.id}
                          column={col}
                          epicId={epic?.id}
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
          })}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeTicket ? <TicketCard ticket={activeTicket} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {isTicketDrawerOpen && <TicketDrawer />}
      {isEpicDrawerOpen && <EpicDrawer />}
      {isCreateTicketOpen && <CreateTicketModal />}

      {confirmRelease && (
        <ConfirmDialog
          title="Release done tickets?"
          message={`${doneCount} ticket${doneCount !== 1 ? 's' : ''} will be moved to the Releases archive and removed from the board. This cannot be undone.`}
          confirmLabel="Release"
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
    </div>
  );
}

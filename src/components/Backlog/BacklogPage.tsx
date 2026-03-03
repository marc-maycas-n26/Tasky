import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { useStore } from '../../store';
import { CreateTicketModal } from '../Ticket/CreateTicketModal';
import { TicketDrawer } from '../Ticket/TicketDrawer';
import { EpicDrawer } from '../Epic/EpicDrawer';
import { BacklogSection } from './BacklogSection';
import type { Ticket } from '../../types';
import './BacklogPage.css';

export function BacklogPage() {
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const epics = useStore(s => s.epics);
  const isCreateTicketOpen = useStore(s => s.isCreateTicketOpen);
  const isTicketDrawerOpen = useStore(s => s.isTicketDrawerOpen);
  const isEpicDrawerOpen = useStore(s => s.isEpicDrawerOpen);
  const openEpic = useStore(s => s.openEpic);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const reorderTickets = useStore(s => s.reorderTickets);
  const moveToBoard = useStore(s => s.moveToBoard);
  const moveToBacklog = useStore(s => s.moveToBacklog);
  const updateTicket = useStore(s => s.updateTicket);

  const [search, setSearch] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overEpicId, setOverEpicId] = useState<string | null | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const backlogTickets = tickets
    .filter(t => t.inBacklog === true && !t.parentId)
    .sort((a, b) => a.order - b.order);

  const boardTickets = tickets
    .filter(t => t.inBacklog !== true && !!t.columnId && !t.parentId)
    .sort((a, b) => a.order - b.order);

  function handleDragStart(e: DragStartEvent) {
    const ticket = tickets.find(t => t.id === e.active.id);
    setActiveTicket(ticket ?? null);
    setOverEpicId(undefined);
  }

  function handleDragOver(e: DragOverEvent) {
    const overId = e.over?.id as string | undefined;
    if (!overId) { setOverEpicId(undefined); return; }
    const overTicket = tickets.find(t => t.id === overId);
    // null = "No epic" group, undefined = not over a ticket row
    setOverEpicId(overTicket ? (overTicket.epicId ?? null) : undefined);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTicket(null);
    setOverEpicId(undefined);
    const { active, over } = e;
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;
    const dragged = tickets.find(t => t.id === draggedId);
    if (!dragged) return;

    // Dropped on the Board section drop zone → move backlog ticket to board
    if (overId === 'section-board') {
      if (dragged.inBacklog) {
        const firstCol = [...columns]
          .filter(c => !c.isBacklog)
          .sort((a, b) => a.order - b.order)[0];
        if (firstCol) moveToBoard(draggedId, firstCol.id);
      }
      return;
    }

    // Dropped on the Backlog section drop zone → move board ticket to backlog
    if (overId === 'section-backlog') {
      if (!dragged.inBacklog) moveToBacklog(draggedId);
      return;
    }

    // Dropped onto another ticket row — reorder within same section
    const overTicket = tickets.find(t => t.id === overId);
    if (overTicket && draggedId !== overId) {
      // Cross-section drop: ticket dragged over a row in the other section
      if (dragged.inBacklog !== overTicket.inBacklog) {
        if (dragged.inBacklog) {
          // backlog ticket dropped on a board row → move to board, same column as target
          moveToBoard(draggedId, overTicket.columnId || (
            [...columns].filter(c => !c.isBacklog).sort((a, b) => a.order - b.order)[0]?.id ?? ''
          ));
        } else {
          // board ticket dropped on a backlog row → move to backlog
          moveToBacklog(draggedId);
        }
        return;
      }

      // Same-section drop — reassign epic if dropped into a different epic group
      if (overTicket.epicId !== dragged.epicId) {
        updateTicket(draggedId, { epicId: overTicket.epicId ?? undefined });
      }

      // Reorder within the target epic group
      const targetEpicId = overTicket.epicId;
      const sameGroup = tickets.filter(t =>
        t.inBacklog === dragged.inBacklog && !t.parentId && (t.epicId ?? null) === (targetEpicId ?? null)
      ).sort((a, b) => a.order - b.order);
      const withoutDragged = sameGroup.filter(t => t.id !== draggedId);
      const overIdx = withoutDragged.findIndex(t => t.id === overId);
      const insertIdx = overIdx === -1 ? withoutDragged.length : overIdx;
      withoutDragged.splice(insertIdx, 0, dragged);
      reorderTickets(dragged.columnId, targetEpicId, withoutDragged.map(t => t.id));
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
    <div className="bl-page">
      {/* Toolbar */}
      <div className="bl-toolbar">
        <div className="bl-toolbar-search">
          <span className="board-search-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            className="board-search-input"
            placeholder="Search issues"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="board-toolbar-sep" />

        {epics.length > 0 && (
          <div className="bl-epics-strip">
            {epics.map(ep => {
              const epTickets = tickets.filter(t => t.epicId === ep.id && !t.parentId);
              const doneColIds = columns.filter(c => c.name.toLowerCase() === 'done').map(c => c.id);
              const doneCount = epTickets.filter(t => doneColIds.includes(t.columnId)).length;
              const pct = epTickets.length > 0 ? Math.round((doneCount / epTickets.length) * 100) : 0;
              return (
                <button
                  key={ep.id}
                  className="bl-epic-btn"
                  style={{ borderColor: ep.color + '55' }}
                  onClick={() => openEpic(ep.id)}
                  title={`${epTickets.length} issues · ${pct}% done`}
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M1.5 1h7a.5.5 0 01.5.5v7.5L5 7.25 1 9V1.5a.5.5 0 01.5-.5z" fill={ep.color}/>
                  </svg>
                  <span style={{ color: ep.color, fontWeight: 600 }}>{ep.title}</span>
                  <span className="bl-epic-btn-count">{epTickets.length}</span>
                  {epTickets.length > 0 && (
                    <span className="bl-epic-btn-bar">
                      <span style={{ width: `${pct}%`, background: ep.color }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Clear</button>
        )}

        <div className="board-toolbar-right">
          <button className="btn btn-primary" onClick={() => openCreateTicket({ inBacklog: true })}>
            + Create issue
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bl-content">
        <BacklogSection tickets={boardTickets} search={search} inBacklog={false} activeTicket={activeTicket} overEpicId={overEpicId} />
        <BacklogSection tickets={backlogTickets} search={search} inBacklog={true} activeTicket={activeTicket} overEpicId={overEpicId} />
      </div>

      {isTicketDrawerOpen && <TicketDrawer />}
      {isEpicDrawerOpen && <EpicDrawer />}
      {isCreateTicketOpen && <CreateTicketModal />}
    </div>

    <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
      {activeTicket ? (
        <div className="bl-row bl-row--ghost">
          <span className="bl-row-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
              <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="bl-row-key">{activeTicket.key}</span>
          <span className="bl-row-title">{activeTicket.title}</span>
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}

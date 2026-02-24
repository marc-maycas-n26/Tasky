import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useStore } from '../../store';
import { CreateTicketModal } from '../Ticket/CreateTicketModal';
import { TicketDrawer } from '../Ticket/TicketDrawer';
import { EpicDrawer } from '../Epic/EpicDrawer';
import { BoardSection } from './BoardSection';
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
  const moveTicket = useStore(s => s.moveTicket);
  const reorderTickets = useStore(s => s.reorderTickets);

  const [search, setSearch] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const backlogCol = columns.find(c => c.isBacklog);

  const backlogTickets = tickets
    .filter(t => t.columnId === backlogCol?.id && !t.parentId)
    .sort((a, b) => a.order - b.order);

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

    // Dropped onto a col-{id}-epic-{epicId} drop zone
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

    // Dropped onto another ticket row — reorder within same column
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

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          <button className="btn btn-primary" onClick={() => openCreateTicket({ columnId: backlogCol?.id })}>
            + Create issue
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bl-content">
        <BoardSection />
        <BacklogSection allBacklogTickets={backlogTickets} search={search} />
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

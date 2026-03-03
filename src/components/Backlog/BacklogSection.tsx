import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useStore } from '../../store';
import { EpicGroup } from './EpicGroup';
import type { Ticket } from '../../types';

interface Props {
  tickets: Ticket[];
  search: string;
  inBacklog: boolean;
  activeTicket?: Ticket | null;
  overEpicId?: string | null;
}

export function BacklogSection({ tickets: allTickets, search, inBacklog, activeTicket, overEpicId }: Props) {
  const epics = useStore(s => s.epics);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const [collapsed, setCollapsed] = useState(false);

  const droppableId = inBacklog ? 'section-backlog' : 'section-board';
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const sortedEpics = [...epics].sort((a, b) => a.order - b.order);

  const epicGroups = sortedEpics.map(epic => ({
    epic,
    tickets: allTickets.filter(t => t.epicId === epic.id),
  })).filter(g => g.tickets.length > 0);

  const noEpicTickets = allTickets.filter(t => !t.epicId);
  const total = allTickets.length;

  return (
    <div
      ref={setNodeRef}
      className={`bl-section${isOver ? ' bl-section--drop-over' : ''}`}
    >
      <div
        className="bl-section-header"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="bl-section-toggle">
          {collapsed
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3V2z" fill="currentColor"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4H2z" fill="currentColor"/></svg>
          }
        </span>
        <span className="bl-section-title">{inBacklog ? 'Backlog' : 'Board'}</span>
        <span className="bl-section-count">{total}</span>
        {inBacklog && (
          <div style={{ marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openCreateTicket({ inBacklog: true })}
            >
              + Add issue
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        total === 0 ? (
          <div className="bl-empty">
            {inBacklog ? 'No backlog items. Click "+ Add issue" to create one.' : 'No issues on the board yet.'}
          </div>
        ) : (
          <div className="bl-epic-groups">
            {epicGroups.map(({ epic, tickets }) => (
              <EpicGroup key={epic.id} epic={epic} tickets={tickets} search={search} inBacklog={inBacklog}
                activeTicket={activeTicket} overEpicId={overEpicId} />
            ))}
            {noEpicTickets.length > 0 && (
              <EpicGroup key="__no_epic__" epic={null} tickets={noEpicTickets} search={search} inBacklog={inBacklog}
                activeTicket={activeTicket} overEpicId={overEpicId} />
            )}
          </div>
        )
      )}
    </div>
  );
}

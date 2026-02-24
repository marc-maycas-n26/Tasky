import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useStore } from '../../store';
import { EpicGroup } from './EpicGroup';
import type { Ticket } from '../../types';

interface Props {
  allBacklogTickets: Ticket[];
  search: string;
}

export function BacklogSection({ allBacklogTickets, search }: Props) {
  const epics = useStore(s => s.epics);
  const columns = useStore(s => s.columns);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const backlogCol = columns.find(c => c.isBacklog);
  const [collapsed, setCollapsed] = useState(false);

  // Make the entire backlog section a drop target so dragging from Board→Backlog works too
  const { setNodeRef, isOver } = useDroppable({
    id: backlogCol ? `col-${backlogCol.id}-epic-null` : 'backlog-drop',
  });

  const sortedEpics = [...epics].sort((a, b) => a.order - b.order);

  const epicGroups = sortedEpics.map(epic => ({
    epic,
    tickets: allBacklogTickets.filter(t => t.epicId === epic.id),
  })).filter(g => g.tickets.length > 0 || !search);

  const noEpicTickets = allBacklogTickets.filter(t => !t.epicId);
  const total = allBacklogTickets.length;

  return (
    <div ref={setNodeRef} className={`bl-section${isOver ? ' bl-section--drop-over' : ''}`}>
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
        <span className="bl-section-title">Backlog</span>
        <span className="bl-section-count">{total}</span>
        <div style={{ marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openCreateTicket({ columnId: backlogCol?.id })}
          >
            + Add issue
          </button>
        </div>
      </div>

      {!collapsed && (
        total === 0 ? (
          <div className="bl-empty">No backlog items. Click "+ Add issue" to create one.</div>
        ) : (
          <div className="bl-epic-groups">
            {epicGroups.map(({ epic, tickets }) => (
              <EpicGroup key={epic.id} epic={epic} tickets={tickets} search={search} />
            ))}
            {(epics.length === 0 || noEpicTickets.length > 0 || (!search && epics.length > 0)) && (
              <EpicGroup key="__no_epic__" epic={null} tickets={noEpicTickets} search={search} />
            )}
          </div>
        )
      )}
    </div>
  );
}

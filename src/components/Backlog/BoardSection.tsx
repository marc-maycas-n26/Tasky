import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useStore } from '../../store';
import { BacklogRow } from './BacklogRow';
import { getColumnColor } from '../../utils/columnColor';
import type { Column, Ticket } from '../../types';

function BoardColDropZone({ col, tickets }: { col: Column; tickets: Ticket[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}-epic-null` });
  const dotColor = getColumnColor(col);

  return (
    <div
      ref={setNodeRef}
      className={`bl-board-col-zone${isOver ? ' bl-board-col-zone--over' : ''}`}
    >
      <div className="bl-board-col-zone-header">
        <span className="bl-board-col-zone-dot" style={{ background: dotColor }} />
        <span className="bl-board-col-zone-name" style={{ color: dotColor }}>{col.name}</span>
        <span className="bl-board-col-zone-count">{tickets.length}</span>
      </div>
      {tickets.length === 0 ? (
        <div className={`bl-board-col-zone-empty${isOver ? ' bl-board-col-zone-empty--over' : ''}`}>
          Drop here
        </div>
      ) : (
        tickets.map(t => <BacklogRow key={t.id} ticket={t} />)
      )}
    </div>
  );
}

export function BoardSection() {
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const [collapsed, setCollapsed] = useState(false);

  const boardCols = [...columns].filter(c => !c.isBacklog).sort((a, b) => a.order - b.order);
  const boardTickets = tickets.filter(t => !t.parentId && boardCols.some(c => c.id === t.columnId));

  if (boardTickets.length === 0 && !columns.some(c => !c.isBacklog)) return null;

  return (
    <div className="bl-section">
      <div className="bl-section-header" onClick={() => setCollapsed(c => !c)}>
        <span className="bl-section-toggle">
          {collapsed
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3V2z" fill="currentColor"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4H2z" fill="currentColor"/></svg>
          }
        </span>
        <span className="bl-section-title">Board</span>
        <span className="bl-section-count">{boardTickets.length}</span>
        <span className="bl-section-subtitle">Drag backlog items here to move them to the board</span>
      </div>

      {!collapsed && (
        <div className="bl-board-cols">
          {boardCols.map(col => (
            <BoardColDropZone
              key={col.id}
              col={col}
              tickets={boardTickets.filter(t => t.columnId === col.id).sort((a, b) => a.order - b.order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

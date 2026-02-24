import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column, Ticket } from '../../types';
import { SortableTicketCard } from '../Ticket/SortableTicketCard';
import { useStore } from '../../store';
import { getColumnColor } from '../../utils/columnColor';
import './Board.css';

interface Props {
  column: Column;
  epicId?: string;
  tickets: Ticket[];
}

export function BoardColumn({ column, epicId, tickets }: Props) {
  const droppableId = `col-${column.id}-epic-${epicId ?? 'null'}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const dotColor = getColumnColor(column);

  return (
    <div
      ref={setNodeRef}
      className={`board-column${isOver ? ' board-column--over' : ''}`}
    >
      <div className="board-column-inner-header" style={{ borderBottomColor: dotColor + '55' }}>
        <span className="board-column-inner-dot" style={{ background: dotColor }} />
        <span className="board-column-inner-name" style={{ color: dotColor }}>{column.name}</span>
        <span className="board-column-inner-count">{tickets.length}</span>
      </div>
      <div className="board-column-cards">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map(ticket => (
            <SortableTicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <div className="board-column-empty-drop" />
        )}
      </div>
      <button
        className="board-column-add"
        onClick={() => openCreateTicket({ columnId: column.id, epicId })}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Create issue
      </button>
    </div>
  );
}

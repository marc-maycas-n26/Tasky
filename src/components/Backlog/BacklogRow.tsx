import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useStore } from '../../store';
import { useToast } from '../Common/Toast';
import { StatusBadge } from './StatusBadge';
import type { Ticket, Priority } from '../../types';

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  lowest:  { label: 'Lowest',  color: 'var(--color-priority-lowest)',  icon: '↓↓' },
  low:     { label: 'Low',     color: 'var(--color-priority-low)',     icon: '↓' },
  medium:  { label: 'Medium',  color: 'var(--color-priority-medium)',  icon: '=' },
  high:    { label: 'High',    color: 'var(--color-priority-high)',    icon: '↑' },
  highest: { label: 'Highest', color: 'var(--color-priority-highest)', icon: '↑↑' },
};

export function BacklogRow({ ticket, indented }: { ticket: Ticket; indented?: boolean }) {
  const tags = useStore(s => s.tags);
  const epics = useStore(s => s.epics);
  const openTicket = useStore(s => s.openTicket);
  const columns = useStore(s => s.columns);
  const moveToBoard = useStore(s => s.moveToBoard);
  const moveToBacklog = useStore(s => s.moveToBacklog);
  const ticketTags = tags.filter(t => ticket.tagIds.includes(t.id));
  const ticketEpic = ticket.epicId ? epics.find(e => e.id === ticket.epicId) : null;
  const sortedBoardCols = [...columns].filter(c => !c.isBacklog).sort((a, b) => a.order - b.order);
  const firstTodoCol = sortedBoardCols.find(c => c.role === 'todo' || c.isTodo) ?? sortedBoardCols[0];
  const { show: showToast } = useToast();

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: ticket.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: ticket.id });

  const priority = ticket.priority ? PRIORITY_CONFIG[ticket.priority] : null;

  return (
    <div
      ref={el => { setDragRef(el); setDropRef(el); }}
      className={`bl-row${indented ? ' bl-row--indented' : ''}${isDragging ? ' bl-row--dragging' : ''}${isOver && !isDragging ? ' bl-row--drop-over' : ''}`}
      onClick={() => !isDragging && openTicket(ticket.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && openTicket(ticket.id)}
    >
      {/* drag handle */}
      <span
        className="bl-row-drag-handle"
        aria-hidden="true"
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
      >
        ⠿
      </span>

      <span className="bl-row-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
          <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      </span>

      <span className="bl-row-key">{ticket.key}</span>
      <span className="bl-row-title">{ticket.title}</span>

      <div className="bl-row-meta">
        {ticketTags.length > 0 && ticketTags.map(tag => (
          <span
            key={tag.id}
            className="chip"
            style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
          >
            {tag.name}
          </span>
        ))}
        {priority && (
          <span
            className="bl-row-priority"
            style={{ color: priority.color }}
            title={priority.label}
          >
            <span className="bl-row-priority-icon">{priority.icon}</span>
          </span>
        )}
      </div>

      <StatusBadge ticket={ticket} />

      <button
        className="bl-row-location-btn"
        title={ticket.inBacklog ? 'Move to board' : 'Move to backlog'}
        onClick={e => {
          e.stopPropagation();
          if (ticket.inBacklog) {
            const colId = firstTodoCol?.id;
            if (!colId) return;
            moveToBoard(ticket.id, colId);
            showToast({
              message: `"${ticket.title}" moved to board`,
              undoLabel: 'Undo',
              onUndo: () => moveToBacklog(ticket.id),
            });
          } else {
            const prevColId = ticket.columnId;
            moveToBacklog(ticket.id);
            showToast({
              message: `"${ticket.title}" moved to backlog`,
              undoLabel: 'Undo',
              onUndo: () => moveToBoard(ticket.id, prevColId),
            });
          }
        }}
      >
        {ticket.inBacklog ? (
          // Up arrow — move to board
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          // Down arrow — move to backlog
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 3v8M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <span className="bl-row-chevron" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M4.5 2.5l5 4.5-5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}

import { useDraggable } from '@dnd-kit/core';
import { useStore } from '../../store';
import { StatusBadge } from './StatusBadge';
import type { Priority, Ticket } from '../../types';

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
  const updateTicket = useStore(s => s.updateTicket);
  const ticketTags = tags.filter(t => ticket.tagIds.includes(t.id));
  const ticketEpic = ticket.epicId ? epics.find(e => e.id === ticket.epicId) : null;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id });

  const priority = ticket.priority ? PRIORITY_CONFIG[ticket.priority] : null;

  return (
    <div
      ref={setNodeRef}
      className={`bl-row${indented ? ' bl-row--indented' : ''}${isDragging ? ' bl-row--dragging' : ''}`}
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

      <div className="bl-row-epic-wrap" onClick={e => e.stopPropagation()}>
        <select
          className="bl-row-epic-select"
          value={ticket.epicId ?? ''}
          onChange={e => updateTicket(ticket.id, { epicId: e.target.value || undefined })}
          title="Change epic"
          style={ticketEpic ? { color: ticketEpic.color, borderColor: ticketEpic.color + '55' } : undefined}
        >
          <option value="">No epic</option>
          {epics.map(ep => (
            <option key={ep.id} value={ep.id}>{ep.title}</option>
          ))}
        </select>
      </div>

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
            style={{ background: priority.color + '18', color: priority.color, border: `1px solid ${priority.color}33` }}
            title={priority.label}
          >
            <span className="bl-row-priority-icon">{priority.icon}</span>
            {priority.label}
          </span>
        )}
      </div>

      <StatusBadge ticket={ticket} />

      <span className="bl-row-chevron" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M4.5 2.5l5 4.5-5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}

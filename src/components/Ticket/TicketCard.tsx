import { useStore } from '../../store';
import type { Ticket, Priority } from '../../types';
import { PRIORITY_DOT_COLORS } from '../../constants/priorities';
import './TicketCard.css';

function PriorityDots({ priority }: { priority?: Priority }) {
  if (!priority) return null;
  const colors = PRIORITY_DOT_COLORS[priority];
  return (
    <span className="ticket-card-priority-dots" title={priority}>
      {colors.map((c, i) => (
        <span key={i} className="ticket-card-priority-dot" style={{ background: c }} />
      ))}
    </span>
  );
}

interface Props {
  ticket: Ticket;
  isDragging?: boolean;
}

export function TicketCard({ ticket, isDragging }: Props) {
  const tags = useStore(s => s.tags);
  const openTicket = useStore(s => s.openTicket);

  const ticketTags = tags.filter(t => ticket.tagIds.includes(t.id));

  return (
    <div
      className={`ticket-card${isDragging ? ' ticket-card--dragging' : ''}`}
      onClick={() => openTicket(ticket.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && openTicket(ticket.id)}
    >
      <div className="ticket-card-title">{ticket.title}</div>

      {ticketTags.length > 0 && (
        <div className="ticket-card-tags">
          {ticketTags.map(tag => (
            <span
              key={tag.id}
              className="chip"
              style={{
                background: tag.color + '22',
                color: tag.color,
                border: `1px solid ${tag.color}44`,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="ticket-card-footer">
        <span className="ticket-card-key-row">
          <TicketIcon />
          <span className="ticket-card-key">{ticket.key}</span>
        </span>

        <div className="ticket-card-meta-right">
          {ticket.dueDate && (
            <span className={`ticket-card-due${new Date(ticket.dueDate) < new Date() ? ' ticket-card-due--overdue' : ''}`}>
              {new Date(ticket.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}

          <PriorityDots priority={ticket.priority} />

        </div>
      </div>
    </div>
  );
}

function TicketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
      <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

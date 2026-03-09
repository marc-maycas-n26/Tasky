import { useStore } from '../../store';
import type { Ticket } from '../../types';
import { PRIORITY_COLORS } from '../../constants/priorities';
import './TicketCard.css';

interface Props {
  ticket: Ticket;
  isDragging?: boolean;
}

export function TicketCard({ ticket, isDragging }: Props) {
  const tags = useStore(s => s.tags);
  const openTicket = useStore(s => s.openTicket);

  const ticketTags = tags.filter(t => ticket.tagIds.includes(t.id));
  const priorityColor = ticket.priority ? PRIORITY_COLORS[ticket.priority] : undefined;

  return (
    <div
      className={`ticket-card${isDragging ? ' ticket-card--dragging' : ''}`}
      style={priorityColor ? { borderLeftColor: priorityColor, borderLeftWidth: 6 } : undefined}
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
              {new Date(ticket.dueDate).toLocaleDateString('en-GB')}
            </span>
          )}

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

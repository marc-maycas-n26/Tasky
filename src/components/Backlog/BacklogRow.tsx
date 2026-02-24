import { useStore } from '../../store';
import { StatusBadge } from './StatusBadge';
import type { Ticket } from '../../types';

export function BacklogRow({ ticket, indented }: { ticket: Ticket; indented?: boolean }) {
  const tags = useStore(s => s.tags);
  const openTicket = useStore(s => s.openTicket);
  const ticketTags = tags.filter(t => ticket.tagIds.includes(t.id));

  return (
    <div
      className={`bl-row${indented ? ' bl-row--indented' : ''}`}
      onClick={() => openTicket(ticket.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && openTicket(ticket.id)}
    >
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
        {ticket.priority && (
          <span className="bl-row-priority">
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
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

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
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const openTicket = useStore(s => s.openTicket);

  const ticketTags = tags.filter(t => ticket.tagIds.includes(t.id));
  const subTickets = tickets.filter(t => t.parentId === ticket.id);
  const doneCol = columns.find(c => c.name.toLowerCase() === 'done');
  const doneSubCount = subTickets.filter(st => st.columnId === doneCol?.id).length;

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
        {/* Left: subtask icon + key */}
        <span className="ticket-card-key-row">
          <SubtaskIcon />
          <span className="ticket-card-key">{ticket.key}</span>
        </span>

        {/* Right: priority dots + chevron + subtask count + due + avatar */}
        <div className="ticket-card-meta-right">
          {subTickets.length > 0 && (
            <span className="ticket-card-subtasks" title={`${doneSubCount}/${subTickets.length} child issues`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2h8v2H2V2zm1 3h6v5H3V5z" fill="#8993A4" />
              </svg>
              {doneSubCount}/{subTickets.length}
            </span>
          )}

          {ticket.dueDate && (
            <span className={`ticket-card-due${new Date(ticket.dueDate) < new Date() ? ' ticket-card-due--overdue' : ''}`}>
              {new Date(ticket.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}

          <PriorityDots priority={ticket.priority} />

          {/* Chevron (expand) */}
          <span className="ticket-card-chevron" title="Priority">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5l3 3 3-3" stroke="#8993A4" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </span>

          {/* Avatar */}
          <span className="ticket-card-avatar" title="Unassigned">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="8" fill="#DFE1E6" />
              <circle cx="8" cy="6" r="2.5" fill="#97A0AF" />
              <path d="M3 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5" fill="#97A0AF" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function SubtaskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
      <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

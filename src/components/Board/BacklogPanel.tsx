import { useRef, useState } from 'react';
import { useStore } from '../../store';
import type { Ticket } from '../../types';
import './BacklogPanel.css';

function MoveMenu({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const columns = useStore(s => s.columns);
  const tickets = useStore(s => s.tickets);
  const moveTicket = useStore(s => s.moveTicket);

  const boardCols = [...columns]
    .filter(c => !c.isBacklog)
    .sort((a, b) => a.order - b.order);

  function handleMove(colId: string) {
    const colTickets = tickets
      .filter(t => t.columnId === colId && (t.epicId ?? null) === (ticket.epicId ?? null) && !t.parentId)
      .sort((a, b) => a.order - b.order);
    moveTicket(ticket.id, colId, ticket.epicId, colTickets.length);
    onClose();
  }

  return (
    <>
      <div className="backlog-move-backdrop" onClick={onClose} />
      <div className="backlog-move-menu" role="menu">
        <div className="backlog-move-menu-label">Move to column</div>
        {boardCols.map(col => (
          <button
            key={col.id}
            className="backlog-move-option"
            role="menuitem"
            onClick={() => handleMove(col.id)}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.5"/>
            </svg>
            {col.name}
          </button>
        ))}
      </div>
    </>
  );
}

function BacklogRow({ ticket }: { ticket: Ticket }) {
  const tags = useStore(s => s.tags);
  const epics = useStore(s => s.epics);
  const openTicket = useStore(s => s.openTicket);
  const ticketTags = tags.filter(t => ticket.tagIds.includes(t.id));
  const epic = ticket.epicId ? epics.find(e => e.id === ticket.epicId) : undefined;
  const [moveOpen, setMoveOpen] = useState(false);
  const moveRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="backlog-row"
      onClick={() => openTicket(ticket.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && openTicket(ticket.id)}
    >
      <span className="backlog-row-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
          <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      </span>

      <span className="backlog-row-key">{ticket.key}</span>

      <span className="backlog-row-title">{ticket.title}</span>

      {epic && (
        <span
          className="backlog-row-epic"
          style={{ background: epic.color + '22', color: epic.color, border: `1px solid ${epic.color}55` }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5 1h7a.5.5 0 01.5.5v7.5L5 7.25 1 9V1.5a.5.5 0 01.5-.5z" fill={epic.color}/>
          </svg>
          {epic.title}
        </span>
      )}

      {ticketTags.length > 0 && (
        <span className="backlog-row-tags">
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
        </span>
      )}

      {ticket.priority && (
        <span className="backlog-row-priority" title={ticket.priority}>
          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
        </span>
      )}

      {/* Move to board button */}
      <div
        ref={moveRef}
        className="backlog-row-move-wrap"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="backlog-row-move-btn"
          title="Move to board column"
          onClick={() => setMoveOpen(o => !o)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Move to board
        </button>
        {moveOpen && (
          <MoveMenu ticket={ticket} onClose={() => setMoveOpen(false)} />
        )}
      </div>

      <span className="backlog-row-chevron" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4.5 2.5l5 4.5-5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}

export function BacklogPanel() {
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const [collapsed, setCollapsed] = useState(false);

  const backlogCol = columns.find(c => c.isBacklog);
  if (!backlogCol) return null;

  const backlogTickets = tickets
    .filter(t => t.columnId === backlogCol.id && !t.parentId)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="backlog-panel">
      <div className="backlog-header" onClick={() => setCollapsed(c => !c)}>
        <span className="backlog-toggle" aria-label={collapsed ? 'Expand backlog' : 'Collapse backlog'}>
          {collapsed ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 2l4 3-4 3V2z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3l3 4 3-4H2z" fill="currentColor"/>
            </svg>
          )}
        </span>

        <span className="backlog-header-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="3" width="11" height="2" rx="1" fill="#6B7280"/>
            <rect x="1.5" y="6.5" width="11" height="2" rx="1" fill="#6B7280"/>
            <rect x="1.5" y="10" width="7" height="2" rx="1" fill="#6B7280"/>
          </svg>
        </span>

        <span className="backlog-header-title">Backlog</span>
        <span className="backlog-header-count">{backlogTickets.length}</span>

        <button
          className="backlog-add-btn"
          title="Add issue to backlog"
          onClick={e => {
            e.stopPropagation();
            openCreateTicket({ columnId: backlogCol.id });
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add issue
        </button>
      </div>

      {!collapsed && (
        <div className="backlog-list">
          {backlogTickets.length === 0 ? (
            <div className="backlog-empty">
              No backlog items. Add issues here before moving them to the board.
            </div>
          ) : (
            backlogTickets.map(ticket => (
              <BacklogRow key={ticket.id} ticket={ticket} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

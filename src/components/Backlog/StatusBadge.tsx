import { useRef, useState } from 'react';
import { useStore } from '../../store';
import { getColumnColor } from '../../utils/columnColor';
import type { Ticket } from '../../types';

export function StatusBadge({ ticket }: { ticket: Ticket }) {
  const columns = useStore(s => s.columns);
  const tickets = useStore(s => s.tickets);
  const moveTicket = useStore(s => s.moveTicket);
  const moveToBoard = useStore(s => s.moveToBoard);
  const moveToBacklog = useStore(s => s.moveToBacklog);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const boardCols = [...columns].filter(c => !c.isBacklog).sort((a, b) => a.order - b.order);
  const currentCol = ticket.inBacklog ? null : columns.find(c => c.id === ticket.columnId);

  function handleMove(colId: string | '__backlog__') {
    if (colId === '__backlog__') {
      moveToBacklog(ticket.id);
      setOpen(false);
      return;
    }
    if (!ticket.inBacklog && colId === ticket.columnId) { setOpen(false); return; }
    if (ticket.inBacklog) {
      moveToBoard(ticket.id, colId);
    } else {
      const colTickets = tickets
        .filter(t => t.columnId === colId && (t.epicId ?? null) === (ticket.epicId ?? null) && !t.parentId)
        .sort((a, b) => a.order - b.order);
      moveTicket(ticket.id, colId, ticket.epicId, colTickets.length);
    }
    setOpen(false);
  }

  function openMenu() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 5, right: window.innerWidth - rect.right });
    }
    setOpen(o => !o);
  }

  function getBadgeStyle(col: typeof currentCol) {
    if (!col) return {};
    const hex = getColumnColor(col);
    return {
      background: hex + '18',
      color: hex,
      borderColor: hex + '44',
    };
  }

  return (
    <div className="bl-status-wrap" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        className="bl-status-badge"
        style={getBadgeStyle(currentCol)}
        onClick={openMenu}
        title="Change column"
      >
        {ticket.inBacklog ? 'Backlog' : (currentCol?.name ?? '—')}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ opacity: 0.7 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="bl-status-backdrop" onClick={() => setOpen(false)} />
          <div className="bl-status-menu" role="menu" style={{ top: menuPos.top, right: menuPos.right }}>
            <div className="bl-status-menu-label">{ticket.inBacklog ? 'Move to board' : 'Move to'}</div>
            {!ticket.inBacklog && (
              <button
                className="bl-status-option"
                role="menuitem"
                onClick={() => handleMove('__backlog__')}
              >
                <span className="bl-status-option-dot" style={{ background: '#6B7280' }} />
                <span>Backlog</span>
              </button>
            )}
            {boardCols.map(col => {
              const s = getBadgeStyle(col);
              const isCurrent = !ticket.inBacklog && col.id === ticket.columnId;
              return (
                <button
                  key={col.id}
                  className={`bl-status-option${isCurrent ? ' bl-status-option--active' : ''}`}
                  role="menuitem"
                  onClick={() => handleMove(col.id)}
                >
                  <span className="bl-status-option-dot" style={{ background: s.color }} />
                  <span style={{ color: isCurrent ? s.color : undefined, fontWeight: isCurrent ? 700 : undefined }}>
                    {col.name}
                  </span>
                  {isCurrent && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', color: s.color }}>
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

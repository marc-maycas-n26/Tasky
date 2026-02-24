import { useState } from 'react';
import { useStore } from '../../store';
import { BoardColumnGroup } from './BoardColumnGroup';

export function BoardSection() {
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const [collapsed, setCollapsed] = useState(false);

  const boardCols = [...columns].filter(c => !c.isBacklog).sort((a, b) => a.order - b.order);
  const boardTickets = tickets.filter(t => !t.parentId && boardCols.some(c => c.id === t.columnId));

  if (boardTickets.length === 0) return null;

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
        <span className="bl-section-subtitle">In progress on the kanban</span>
      </div>

      {!collapsed && (
        <div className="bl-epic-groups">
          {boardCols
            .filter(col => boardTickets.some(t => t.columnId === col.id))
            .map(col => (
              <BoardColumnGroup
                key={col.id}
                col={col}
                tickets={[...boardTickets]
                  .filter(t => t.columnId === col.id)
                  .sort((a, b) => a.order - b.order)}
              />
            ))
          }
        </div>
      )}
    </div>
  );
}

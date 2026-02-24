import { useState } from 'react';
import { BacklogRow } from './BacklogRow';
import { getColumnColor } from '../../utils/columnColor';
import type { Column, Ticket } from '../../types';

interface Props {
  col: Column;
  tickets: Ticket[];
}

export function BoardColumnGroup({ col, tickets }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const dotColor = getColumnColor(col);

  return (
    <div className="bl-epic-group">
      <div className="bl-epic-group-header" onClick={() => setCollapsed(c => !c)}>
        <span className="bl-epic-group-toggle">
          {collapsed
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3V2z" fill="currentColor"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4H2z" fill="currentColor"/></svg>
          }
        </span>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span className="bl-epic-group-title" style={{ color: dotColor }}>{col.name}</span>
        <span className="bl-epic-group-count">{tickets.length}</span>
      </div>

      {!collapsed && (
        tickets.length === 0 ? (
          <div className="bl-epic-group-empty">No issues in this column.</div>
        ) : (
          tickets.map(ticket => (
            <BacklogRow key={ticket.id} ticket={ticket} indented />
          ))
        )
      )}
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '../../store';
import { BacklogRow } from './BacklogRow';
import type { Epic, Ticket } from '../../types';

interface Props {
  epic: Epic | null;
  tickets: Ticket[];
  search: string;
}

export function EpicGroup({ epic, tickets, search }: Props) {
  const columns = useStore(s => s.columns);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const openEpic = useStore(s => s.openEpic);
  const backlogCol = columns.find(c => c.isBacklog);
  const [collapsed, setCollapsed] = useState(false);

  const filtered = search
    ? tickets.filter(t => {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.key?.toLowerCase().includes(q) ?? false);
      })
    : tickets;

  if (search && filtered.length === 0) return null;

  const doneColIds = columns.filter(c => c.name.toLowerCase() === 'done').map(c => c.id);
  const doneCount = tickets.filter(t => doneColIds.includes(t.columnId)).length;
  const pct = tickets.length > 0 ? Math.round((doneCount / tickets.length) * 100) : 0;

  return (
    <div className="bl-epic-group">
      <div
        className="bl-epic-group-header"
        onClick={() => setCollapsed(c => !c)}
        style={epic ? { borderLeftColor: epic.color } : undefined}
      >
        <span className="bl-epic-group-toggle">
          {collapsed
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3V2z" fill="currentColor"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4H2z" fill="currentColor"/></svg>
          }
        </span>

        {epic ? (
          <>
            <span className="bl-epic-group-icon">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 1.5h9a1 1 0 011 1v10l-5.5-2.75L1.5 12.5v-10a1 1 0 011-1z" fill={epic.color}/>
              </svg>
            </span>
            <button
              className="bl-epic-group-title"
              style={{ color: epic.color }}
              onClick={e => { e.stopPropagation(); openEpic(epic.id); }}
              title="Open epic details"
            >
              {epic.title}
            </button>
          </>
        ) : (
          <span className="bl-epic-group-title bl-epic-group-title--none">No epic</span>
        )}

        <span className="bl-epic-group-count">{tickets.length}</span>

        {epic && tickets.length > 0 && (
          <span className="bl-epic-group-progress" title={`${pct}% done`}>
            <span className="bl-epic-group-progress-bar">
              <span style={{ width: `${pct}%`, background: epic.color }} />
            </span>
            <span className="bl-epic-group-progress-label">{pct}%</span>
          </span>
        )}

        <button
          className="bl-epic-group-add"
          title="Add issue to this group"
          onClick={e => {
            e.stopPropagation();
            openCreateTicket({ epicId: epic?.id, columnId: backlogCol?.id });
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add issue
        </button>
      </div>

      {!collapsed && (
        filtered.length === 0 ? (
          <div className="bl-epic-group-empty">No issues in this epic yet.</div>
        ) : (
          filtered.map(ticket => (
            <BacklogRow key={ticket.id} ticket={ticket} indented />
          ))
        )
      )}
    </div>
  );
}

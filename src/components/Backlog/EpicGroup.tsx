import { useState } from 'react';
import { useStore } from '../../store';
import { BacklogRow } from './BacklogRow';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import type { Epic, Ticket } from '../../types';

interface Props {
  epic: Epic | null;
  tickets: Ticket[];
  search: string;
  inBacklog?: boolean;
  activeTicket?: Ticket | null;
  overEpicId?: string | null;
}

export function EpicGroup({ epic, tickets, search, inBacklog = true, activeTicket, overEpicId }: Props) {
  const columns = useStore(s => s.columns);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const openEpic = useStore(s => s.openEpic);
  const releaseEpic = useStore(s => s.releaseEpic);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);

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
  const allDone = epic !== null && tickets.length > 0 && doneCount === tickets.length;

  // Drag-over state: is the user dragging a ticket from a *different* epic over this group?
  const thisEpicId = epic?.id ?? null;
  const isDragging = !!activeTicket;
  const isDraggingFromThisEpic = isDragging && (activeTicket!.epicId ?? null) === thisEpicId;
  const isTargetEpic = isDragging && overEpicId !== undefined && (overEpicId ?? null) === thisEpicId;
  const isDimmed = isDragging && !isDraggingFromThisEpic && !isTargetEpic;

  return (
    <>
    <div className={`bl-epic-group${isDimmed ? ' bl-epic-group--dimmed' : ''}${isTargetEpic && !isDraggingFromThisEpic ? ' bl-epic-group--drop-target' : ''}`}>
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

        {allDone && (
          <button
            className="bl-epic-group-release"
            title="Release this epic"
            onClick={e => { e.stopPropagation(); setConfirmRelease(true); }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1.5C3.5 1.5 1.5 3.5 1.5 6S3.5 10.5 6 10.5 10.5 8.5 10.5 6 8.5 1.5 6 1.5z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 6l1.5 1.5L8 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Release
          </button>
        )}

        {inBacklog && (
          <button
            className="bl-epic-group-add"
            title="Add issue to this group"
            onClick={e => {
              e.stopPropagation();
              openCreateTicket({ epicId: epic?.id, inBacklog: true });
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add issue
          </button>
        )}
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

    {confirmRelease && epic && (
      <ConfirmDialog
        title="Release epic?"
        message={`"${epic.title}" and its ${tickets.length} ticket${tickets.length === 1 ? '' : 's'} will be moved to Releases. This cannot be undone.`}
        confirmLabel="Release"
        onConfirm={() => { releaseEpic(epic.id); setConfirmRelease(false); }}
        onCancel={() => setConfirmRelease(false)}
      />
    )}
    </>
  );
}

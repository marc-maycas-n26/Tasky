import { useState } from 'react';
import { useStore } from '../../store';
import { PRIORITY_COLORS, PRIORITY_ICONS } from '../../constants/priorities';
import { ConfirmDialog } from '../Common/ConfirmDialog';

interface Props {
  parentId: string;
}

export function SubtasksTable({ parentId }: Props) {
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const updateTicket = useStore(s => s.updateTicket);
  const trashTicket = useStore(s => s.trashTicket);
  const addTicket = useStore(s => s.addTicket);
  const openTicket = useStore(s => s.openTicket);

  const [newTitle, setNewTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const parent = tickets.find(t => t.id === parentId)!;
  const subTickets = tickets.filter(t => t.parentId === parentId);
  const doneCol = columns.find(c => c.name.toLowerCase() === 'done');
  const doneCount = subTickets.filter(st => st.columnId === doneCol?.id).length;
  const pct = subTickets.length > 0 ? Math.round((doneCount / subTickets.length) * 100) : 0;

  function handleAdd() {
    if (!newTitle.trim()) return;
    addTicket({ title: newTitle.trim(), columnId: parent.columnId, epicId: parent.epicId, parentId, tagIds: [] });
    setNewTitle('');
  }

  return (
    <div className="subtasks-section">
      <div className="subtasks-header">
        <span className="subtasks-title">Subtasks</span>
        <span className="subtasks-progress-label">{pct}% Done</span>
      </div>
      <div className="subtasks-progress-bar">
        <div className="subtasks-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {subTickets.length > 0 && (
        <table className="subtasks-table">
          <thead>
            <tr>
              <th>Work</th>
              <th>Priority</th>
              <th>Story pts</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subTickets.map(st => (
              <tr key={st.id} className="subtask-row">
                <td className="subtask-work-cell">
                  <span className="subtask-link-icon">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="#5E6C84" strokeWidth="1.2" fill="none"/>
                      <path d="M4 4h4M4 6h4M4 8h2" stroke="#5E6C84" strokeWidth="0.9" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <button className="subtask-key-link" onClick={() => openTicket(st.id)}>
                    {st.key}
                  </button>
                  <span className="subtask-title-text">{st.title}</span>
                </td>
                <td>
                  {st.priority ? (
                    <span style={{ color: PRIORITY_COLORS[st.priority], fontSize: 11, fontWeight: 600 }}>
                      {PRIORITY_ICONS[st.priority]} {st.priority.charAt(0).toUpperCase() + st.priority.slice(1)}
                    </span>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>
                <td>
                  <span className="text-subtle" style={{ fontSize: 11 }}>
                    {st.estimate ?? <span className="subtask-add-pts">Add pts</span>}
                  </span>
                </td>
                <td>
                  <select
                    className="subtask-status-select"
                    value={st.columnId}
                    onChange={e => updateTicket(st.id, { columnId: e.target.value })}
                  >
                    {[...columns].sort((a, b) => a.order - b.order).map(c => (
                      <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-icon btn-ghost btn-sm"
                    onClick={() => setConfirmDeleteId(st.id)}
                    title="Delete"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="subtask-add-row">
        <input
          className="form-input"
          placeholder="Add child issue…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleAdd}>Add</button>
      </div>

      {confirmDeleteId && (() => {
        const st = subTickets.find(t => t.id === confirmDeleteId);
        if (!st) return null;
        return (
          <ConfirmDialog
            title="Move to trash?"
            message={`"${st.title}" will be moved to the trash and permanently deleted after 30 days.`}
            confirmLabel="Move to trash"
            dangerous
            onConfirm={() => { trashTicket(confirmDeleteId); setConfirmDeleteId(null); }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
    </div>
  );
}

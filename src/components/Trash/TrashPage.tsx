import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import './TrashPage.css';

function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function TrashPage() {
  const trashedTickets = useStore(s => s.trashedTickets);
  const restoreTicket = useStore(s => s.restoreTicket);
  const purgeTicket = useStore(s => s.purgeTicket);
  const purgeExpiredTrash = useStore(s => s.purgeExpiredTrash);
  const columns = useStore(s => s.columns);

  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);

  useEffect(() => {
    purgeExpiredTrash();
  }, [purgeExpiredTrash]);

  const topLevel = trashedTickets.filter(tr => !tr.ticket.parentId);

  function getColumnName(colId: string) {
    return columns.find(c => c.id === colId)?.name ?? 'Unknown';
  }

  const sorted = [...topLevel].sort((a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime());

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Trash</h1>
        <p className="page-subtitle">Items are permanently deleted after 30 days.</p>
      </div>

      <div className="card">
        <div className="card-header columns-card-header">
          <span>All items ({topLevel.length})</span>
          {topLevel.length > 0 && (
            <button className="btn btn-sm btn-icon-danger" onClick={() => setConfirmEmptyAll(true)}>
              Empty trash
            </button>
          )}
        </div>

        {topLevel.length === 0 ? (
          <div className="card-empty">Trash is empty.</div>
        ) : (
          <div className="tmpl-list">
            {sorted.map(({ ticket, trashedAt, expiresAt }) => {
              const days = daysLeft(expiresAt);
              const subtaskCount = trashedTickets.filter(tr => tr.ticket.parentId === ticket.id).length;
              return (
                <div key={ticket.id} className="tmpl-item">
                  <div className="tmpl-item-info">
                    <div className="trash-item-top">
                      <span className="trash-item-key">{ticket.key}</span>
                      <span className="tmpl-item-name">{ticket.title}</span>
                    </div>
                    <div className="tmpl-item-meta trash-item-meta">
                      <span className="trash-item-column">{getColumnName(ticket.columnId)}</span>
                      {subtaskCount > 0 && (
                        <span>+{subtaskCount} subtask{subtaskCount > 1 ? 's' : ''}</span>
                      )}
                      <span>Deleted {new Date(trashedAt).toLocaleDateString()}</span>
                      <span className={`trash-item-expires${days <= 3 ? ' trash-item-expires--urgent' : days <= 7 ? ' trash-item-expires--warning' : ''}`}>
                        {days === 0 ? 'Deletes today' : `${days}d left`}
                      </span>
                    </div>
                  </div>
                  <div className="table-actions">
                    <button
                      className="btn btn-icon btn-primary btn-sm"
                      title="Restore"
                      onClick={() => restoreTicket(ticket.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3 8a5 5 0 105 -5H5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M3 4v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="btn btn-icon btn-sm btn-icon-danger"
                      title="Delete permanently"
                      onClick={() => setConfirmPurgeId(ticket.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3 3.5l.5 8.5a.5.5 0 00.5.5h6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmPurgeId && (() => {
        const entry = topLevel.find(tr => tr.ticket.id === confirmPurgeId);
        if (!entry) return null;
        return (
          <ConfirmDialog
            title="Delete permanently?"
            message={`"${entry.ticket.title}" will be deleted forever and cannot be recovered.`}
            confirmLabel="Delete forever"
            dangerous
            onConfirm={() => { purgeTicket(confirmPurgeId); setConfirmPurgeId(null); }}
            onCancel={() => setConfirmPurgeId(null)}
          />
        );
      })()}

      {confirmEmptyAll && (
        <ConfirmDialog
          title="Empty trash?"
          message={`All ${topLevel.length} items will be permanently deleted and cannot be recovered.`}
          confirmLabel="Empty trash"
          dangerous
          onConfirm={() => { topLevel.forEach(tr => purgeTicket(tr.ticket.id)); setConfirmEmptyAll(false); }}
          onCancel={() => setConfirmEmptyAll(false)}
        />
      )}
    </div>
  );
}

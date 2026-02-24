import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import './TrashPage.css';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

  // Auto-purge expired items on mount
  useEffect(() => {
    purgeExpiredTrash();
  }, [purgeExpiredTrash]);

  // Only show top-level trashed tickets (not subtasks — they're restored together with the parent)
  const topLevel = trashedTickets.filter(tr => !tr.ticket.parentId);

  function getColumnName(colId: string) {
    return columns.find(c => c.id === colId)?.name ?? 'Unknown';
  }

  return (
    <div className="trash-page">
      <div className="trash-page-header">
        <div className="trash-page-title-row">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="trash-page-icon">
            <path d="M3 5.5h16M8.5 5.5V4a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v1.5M5 5.5l1 13a.5.5 0 00.5.5h9a.5.5 0 00.5-.5l1-13M9 9l.5 6M13 9l-.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="trash-page-title">Trash</h1>
          <span className="trash-page-count">{topLevel.length} {topLevel.length === 1 ? 'item' : 'items'}</span>
        </div>
        <p className="trash-page-subtitle">
          Items are permanently deleted after 30 days.
        </p>
        {topLevel.length > 0 && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setConfirmEmptyAll(true)}
          >
            Empty trash
          </button>
        )}
      </div>

      {topLevel.length === 0 ? (
        <div className="trash-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="trash-empty-icon">
            <path d="M8 12h32M18 12V9a1 1 0 011-1h10a1 1 0 011 1v3M11 12l2 28a1 1 0 001 1h20a1 1 0 001-1l2-28M20 20l1 12M28 20l-1 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>Trash is empty</p>
        </div>
      ) : (
        <div className="trash-list">
          {[...topLevel]
            .sort((a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime())
            .map(({ ticket, trashedAt, expiresAt }) => {
              const days = daysLeft(expiresAt);
              const subtaskCount = trashedTickets.filter(
                tr => tr.ticket.parentId === ticket.id
              ).length;
              return (
                <div key={ticket.id} className="trash-item">
                  <div className="trash-item-icon">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                      <path d="M5 5h4M5 7h4M5 9h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="trash-item-body">
                    <div className="trash-item-top">
                      <span className="trash-item-key">{ticket.key}</span>
                      <span className="trash-item-title">{ticket.title}</span>
                    </div>
                    <div className="trash-item-meta">
                      <span className="trash-item-column">{getColumnName(ticket.columnId)}</span>
                      {subtaskCount > 0 && (
                        <span className="trash-item-subtasks">+{subtaskCount} subtask{subtaskCount > 1 ? 's' : ''}</span>
                      )}
                      <span className="trash-item-trashed">
                        Deleted {new Date(trashedAt).toLocaleDateString()}
                      </span>
                      <span className={`trash-item-expires${days <= 3 ? ' trash-item-expires--urgent' : days <= 7 ? ' trash-item-expires--warning' : ''}`}>
                        {days === 0 ? 'Deletes today' : `${days}d left`}
                      </span>
                    </div>
                  </div>
                  <div className="trash-item-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => restoreTicket(ticket.id)}
                      title="Restore ticket"
                    >
                      Restore
                    </button>
                    <button
                      className="btn btn-ghost btn-sm trash-item-delete-btn"
                      onClick={() => setConfirmPurgeId(ticket.id)}
                      title="Delete permanently"
                    >
                      Delete permanently
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

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
          onConfirm={() => {
            topLevel.forEach(tr => purgeTicket(tr.ticket.id));
            setConfirmEmptyAll(false);
          }}
          onCancel={() => setConfirmEmptyAll(false)}
        />
      )}
    </div>
  );
}

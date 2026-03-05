import { useState } from 'react';
import { useStore } from '../../store';

const UserAvatar = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="14" fill="#DFE1E6"/>
    <circle cx="14" cy="11" r="4" fill="#97A0AF"/>
    <path d="M5 24c0-4.97 4.03-9 9-9s9 4.03 9 9" fill="#97A0AF"/>
  </svg>
);

const SystemIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="var(--color-border)" strokeWidth="1.5" fill="var(--color-bg)"/>
    <path d="M6 9l2 2 4-4" stroke="var(--color-primary)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface Props {
  ticketId: string;
}

export function ActivitySection({ ticketId }: Props) {
  const comments = useStore(s => s.comments);
  const addComment = useStore(s => s.addComment);
  const deleteComment = useStore(s => s.deleteComment);

  const ticketComments = comments.filter(c => c.ticketId === ticketId);
  const [body, setBody] = useState('');
  const [tab, setTab] = useState<'sitrep' | 'history'>('sitrep');

  function handleSubmit() {
    if (!body.trim()) return;
    addComment(ticketId, body.trim());
    setBody('');
  }

  function renderCommentBody(text: string) {
    // Render **bold** markers in system messages
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  }

  return (
    <div className="activity-section">
      <div className="activity-header">Activity</div>
      <div className="activity-tabs">
        {(['sitrep', 'history'] as const).map(t => (
          <button
            key={t}
            className={`activity-tab${tab === t ? ' activity-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'sitrep' && (
        <>
          <div className="comment-input-row">
            <span className="comment-avatar"><UserAvatar /></span>
            <div className="comment-input-wrapper">
              <textarea
                className="comment-input"
                placeholder="Add a sitrep…"
                value={body}
                rows={body ? 3 : 1}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
              />
              {body && (
                <div className="comment-input-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setBody('')}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          {ticketComments.length > 0 && (
            <div className="comment-list">
              {ticketComments.map(c => c.isSystem ? (
                <div key={c.id} className="system-event-row">
                  <span className="system-event-icon"><SystemIcon /></span>
                  <span className="system-event-body">{renderCommentBody(c.body)}</span>
                  <span className="system-event-time">{new Date(c.createdAt).toLocaleString()}</span>
                  <button
                    className="system-event-delete btn btn-ghost btn-sm"
                    onClick={() => deleteComment(c.id)}
                    title="Remove"
                  >✕</button>
                </div>
              ) : (
                <div key={c.id} className="comment-row">
                  <span className="comment-avatar"><UserAvatar /></span>
                  <div className="comment-body-wrap">
                    <div className="comment-meta">
                      <span className="comment-author">You</span>
                      <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="comment-body">{c.body}</div>
                    <button
                      className="comment-delete btn btn-ghost btn-sm"
                      onClick={() => deleteComment(c.id)}
                    >Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ticketComments.length === 0 && (
            <p className="activity-hint">Pro tip: press <kbd>Ctrl+Enter</kbd> to save</p>
          )}
        </>
      )}

      {tab === 'history' && (
        <p className="activity-hint text-subtle" style={{ padding: '12px 0' }}>
          History tracking is not yet available.
        </p>
      )}
    </div>
  );
}

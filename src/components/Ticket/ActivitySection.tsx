import { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';
import { useStore } from '../../store';
import { RichTextEditor } from './RichTextEditor';

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
  const updateComment = useStore(s => s.updateComment);
  const deleteComment = useStore(s => s.deleteComment);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  function handleCommentClick(e: React.MouseEvent) {
    const img = (e.target as HTMLElement).closest('img');
    if (img) setLightboxSrc((img as HTMLImageElement).src);
  }

  const ticketComments = comments.filter(c => c.ticketId === ticketId);
  const [body, setBody] = useState('');
  const [sortDesc, setSortDesc] = useState(true); // true = most recent first
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const sorted = [...ticketComments].sort((a, b) => {
    return sortDesc
      ? b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt);
  });

  function handleSubmit() {
    if (!body || body === '<p></p>') return;
    addComment(ticketId, body);
    setBody('');
  }

  function startEdit(id: string, currentBody: string) {
    setEditingId(id);
    setEditDraft(currentBody);
  }

  function saveEdit(id: string) {
    if (editDraft && editDraft !== '<p></p>') {
      updateComment(id, editDraft);
    }
    setEditingId(null);
    setEditDraft('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  function renderSystemBody(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  }

  return (
    <div className="activity-section">
      <div className="activity-section-header">
        <span className="activity-header">Activity</span>
        <button
          className="btn btn-ghost btn-sm activity-sort-btn"
          onClick={() => setSortDesc(d => !d)}
          title={sortDesc ? 'Showing newest first' : 'Showing oldest first'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M2 3h8M3 6h6M4 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {sortDesc ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      <div className="comment-input-wrapper">
        <RichTextEditor
          key={`new-${ticketId}`}
          value={body}
          onChange={setBody}
          placeholder="Add a sitrep…"
          onCtrlEnter={handleSubmit}
          compact
        />
        {body && body !== '<p></p>' && (
          <div className="comment-input-actions">
            <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setBody('')}>Cancel</button>
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="comment-list">
          {sorted.map(c => c.isSystem ? (
            <div key={c.id} className="system-event-row">
              <span className="system-event-icon"><SystemIcon /></span>
              <span className="system-event-body">{renderSystemBody(c.body)}</span>
              <span className="system-event-time">{new Date(c.createdAt).toLocaleDateString('en-GB') + ', ' + new Date(c.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              <button
                className="system-event-delete btn btn-ghost btn-sm"
                onClick={() => deleteComment(c.id)}
                title="Remove"
              >✕</button>
            </div>
          ) : (
            <div key={c.id} className="comment-row">
              <div className="comment-body-wrap">
                <div className="comment-meta">
                  <span className="comment-author">You</span>
                  <span className="comment-time">{new Date(c.createdAt).toLocaleDateString('en-GB') + ', ' + new Date(c.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  {c.updatedAt !== c.createdAt && (
                    <span className="comment-edited">(edited)</span>
                  )}
                </div>

                {editingId === c.id ? (
                  <>
                    <RichTextEditor
                      key={`edit-${c.id}`}
                      value={editDraft}
                      onChange={setEditDraft}
                      compact
                    />
                    <div className="comment-input-actions" style={{ marginTop: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(c.id)}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="comment-body rte-content"
                      dangerouslySetInnerHTML={{ __html: c.body }}
                      onClick={handleCommentClick}
                    />
                    <div className="comment-actions">
                      <button
                        className="comment-action-btn btn btn-ghost btn-sm"
                        onClick={() => startEdit(c.id, c.body)}
                      >Edit</button>
                      <button
                        className="comment-action-btn comment-delete btn btn-ghost btn-sm"
                        onClick={() => deleteComment(c.id)}
                      >Delete</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <p className="activity-hint">Pro tip: press <kbd>Ctrl+Enter</kbd> or <kbd>⌘+Enter</kbd> to save</p>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

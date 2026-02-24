import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { ColorPicker } from '../Common/ColorPicker';
import { RichTextEditor } from '../Ticket/RichTextEditor';
import type { EpicStatus } from '../../types';
import './EpicDrawer.css';

const EPIC_STATUS_OPTIONS: { value: EpicStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function EpicDrawer() {
  const selectedEpicId = useStore(s => s.selectedEpicId);
  const epics = useStore(s => s.epics);
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const allTags = useStore(s => s.tags);
  const updateEpic = useStore(s => s.updateEpic);
  const deleteEpic = useStore(s => s.deleteEpic);
  const closeEpic = useStore(s => s.closeEpic);
  const openTicket = useStore(s => s.openTicket);

  const epic = epics.find(e => e.id === selectedEpicId);
  const epicTickets = tickets.filter(t => t.epicId === selectedEpicId && !t.parentId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    if (epic) setTitleDraft(epic.title);
    setEditingTitle(false);
  }, [epic?.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeEpic(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeEpic]);

  if (!epic) return null;

  function saveTitle() {
    if (titleDraft.trim()) updateEpic(epic!.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  }

  function getColumnName(colId: string) {
    return columns.find(c => c.id === colId)?.name ?? colId;
  }

  const doneColIds = columns.filter(c => c.name.toLowerCase() === 'done').map(c => c.id);
  const backlogColIds = columns.filter(c => c.isBacklog).map(c => c.id);
  const doneCount = epicTickets.filter(t => doneColIds.includes(t.columnId)).length;
  const progressPct = epicTickets.length > 0 ? Math.round((doneCount / epicTickets.length) * 100) : 0;

  return (
    <>
      <div className="overlay" onClick={closeEpic} />
      <div className="epic-drawer" role="dialog" aria-label="Epic details">

        {/* ── Top bar ── */}
        <div className="epic-drawer-topbar">
          <div className="epic-drawer-breadcrumb">
            <span
              className="epic-drawer-type-badge"
              style={{ background: epic.color + '22', color: epic.color, border: `1px solid ${epic.color}55` }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1.5 1h7a.5.5 0 01.5.5v8L5 7.75 1 9.5V1.5a.5.5 0 01.5-.5z" fill={epic.color}/>
              </svg>
              Epic
            </span>
          </div>
          <div className="epic-drawer-topbar-actions">
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { deleteEpic(epic.id); closeEpic(); }}
            >
              Delete
            </button>
            <button className="btn btn-icon btn-ghost" onClick={closeEpic} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="epic-drawer-body">
          <div className="epic-drawer-main">

            {/* Title */}
            {editingTitle ? (
              <input
                className="form-input epic-drawer-title-input"
                value={titleDraft}
                autoFocus
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
              />
            ) : (
              <h2
                className="epic-drawer-title"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {epic.title}
              </h2>
            )}

            {/* Description */}
            <div className="drawer-section">
              <div className="drawer-section-label">Description</div>
              <RichTextEditor
                key={epic.id}
                value={epic.description ?? ''}
                onChange={html => updateEpic(epic.id, { description: html || undefined })}
                placeholder="Add a description…"
              />
            </div>

            {/* Progress */}
            {epicTickets.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-label">
                  Progress — {doneCount} / {epicTickets.length} done ({progressPct}%)
                </div>
                <div className="epic-drawer-progress-bar">
                  <div
                    className="epic-drawer-progress-fill"
                    style={{ width: `${progressPct}%`, background: epic.color }}
                  />
                </div>
              </div>
            )}

            {/* Tickets */}
            <div className="drawer-section">
              <div className="drawer-section-label">
                Issues ({epicTickets.length})
              </div>
              {epicTickets.length === 0 ? (
                <p className="epic-drawer-empty">No issues assigned to this epic yet.</p>
              ) : (
                <div className="epic-drawer-tickets">
                  {[...epicTickets].sort((a, b) => a.order - b.order).map(t => {
                    const colName = getColumnName(t.columnId);
                    const isBacklog = backlogColIds.includes(t.columnId);
                    const isDone = doneColIds.includes(t.columnId);
                    return (
                      <button
                        key={t.id}
                        className="epic-drawer-ticket-row"
                        onClick={() => { closeEpic(); openTicket(t.id); }}
                      >
                        <span className="epic-drawer-ticket-icon">
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
                            <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <span className="epic-drawer-ticket-key">{t.key}</span>
                        <span className={`epic-drawer-ticket-title${isDone ? ' epic-drawer-ticket-title--done' : ''}`}>
                          {t.title}
                        </span>
                        <span className={`epic-drawer-ticket-col${isBacklog ? ' epic-drawer-ticket-col--backlog' : ''}`}>
                          {colName}
                        </span>
                        <span className="epic-drawer-ticket-chevron">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5l5 4.5-5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="epic-drawer-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-section-title">Details</div>

              <div className="sidebar-row">
                <span className="sidebar-row-label">Status</span>
                <div className="sidebar-row-value">
                  <div className="epic-drawer-status-pills">
                    <button
                      className={`epic-drawer-status-pill${epic.status == null ? ' epic-drawer-status-pill--active epic-drawer-status-pill--auto' : ' epic-drawer-status-pill--auto'}`}
                      onClick={() => updateEpic(epic.id, { status: undefined })}
                      title="Auto-compute from tickets"
                    >
                      Auto
                    </button>
                    {EPIC_STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`epic-drawer-status-pill epic-drawer-status-pill--${opt.value}${epic.status === opt.value ? ' epic-drawer-status-pill--active' : ''}`}
                        onClick={() => updateEpic(epic.id, { status: opt.value })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="sidebar-row sidebar-row--tags">
                  <span className="sidebar-row-label">Tags</span>
                  <div className="sidebar-row-value">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {allTags.map(tag => {
                        const active = (epic.tagIds ?? []).includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            className="chip"
                            style={{
                              background: active ? tag.color + '22' : 'transparent',
                              color: tag.color,
                              border: `1px solid ${tag.color}66`,
                              cursor: 'pointer',
                              fontSize: 'var(--font-size-xs)',
                              padding: '1px 7px',
                            }}
                            onClick={() => {
                              const cur = epic.tagIds ?? [];
                              updateEpic(epic.id, {
                                tagIds: active ? cur.filter(id => id !== tag.id) : [...cur, tag.id],
                              });
                            }}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="sidebar-row">
                <span className="sidebar-row-label">Color</span>
                <div className="sidebar-row-value">
                  <ColorPicker value={epic.color ?? '#6554C0'} onChange={color => updateEpic(epic.id, { color })} />
                </div>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-row-label">Issues</span>
                <div className="sidebar-row-value">
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                    {epicTickets.length}
                  </span>
                </div>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-row-label">Done</span>
                <div className="sidebar-row-value">
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)', fontWeight: 600 }}>
                    {doneCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="sidebar-footer-info">
              <div>Created {new Date(epic.createdAt).toLocaleDateString()}</div>
              <div>Updated {new Date(epic.updatedAt).toLocaleDateString()}</div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

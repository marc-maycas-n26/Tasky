import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import type { Priority } from '../../types';
import { PRIORITIES, PRIORITY_COLORS, PRIORITY_ICONS } from '../../constants/priorities';
import { RichTextEditor } from './RichTextEditor';
import { StatusPill } from './StatusPill';
import { SubtasksTable } from './SubtasksTable';
import { LinkedItemsSection } from './LinkedItemsSection';
import { ActivitySection } from './ActivitySection';
import { SidebarRow } from '../Common/SidebarRow';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import './TicketDrawer.css';

export function TicketDrawer() {
  const selectedTicketId = useStore(s => s.selectedTicketId);
  const tickets = useStore(s => s.tickets);
  const epics = useStore(s => s.epics);
  const tags = useStore(s => s.tags);
  const updateTicket = useStore(s => s.updateTicket);
  const trashTicket = useStore(s => s.trashTicket);
  const closeTicket = useStore(s => s.closeTicket);
  const openTicket = useStore(s => s.openTicket);

  const ticket = tickets.find(t => t.id === selectedTicketId);
  const parentTicket = ticket?.parentId ? tickets.find(t => t.id === ticket.parentId) : null;
  const drawerRef = useRef<HTMLDivElement>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (ticket) setTitleDraft(ticket.title);
    setEditingTitle(false);
  }, [ticket?.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTicket(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeTicket]);

  if (!ticket) return null;

  function saveTitle() {
    if (titleDraft.trim()) updateTicket(ticket!.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  }

  function toggleTag(tagId: string) {
    const tagIds = ticket!.tagIds.includes(tagId)
      ? ticket!.tagIds.filter(id => id !== tagId)
      : [...ticket!.tagIds, tagId];
    updateTicket(ticket!.id, { tagIds });
  }

  const epicObj = ticket.epicId ? epics.find(e => e.id === ticket.epicId) : null;

  return (
    <>
      <div className="overlay" onClick={closeTicket} />
      <div className="ticket-drawer" ref={drawerRef} role="dialog" aria-label="Ticket details">

        {/* ── Top bar ── */}
        <div className="ticket-drawer-topbar">
          <div className="ticket-drawer-breadcrumb">
            {parentTicket && (
              <>
                <button className="breadcrumb-link" onClick={() => openTicket(parentTicket.id)}>
                  {parentTicket.key}
                </button>
                <span className="breadcrumb-sep">/</span>
              </>
            )}
            <span className="breadcrumb-current">{ticket.key}</span>
          </div>
          <div className="ticket-drawer-topbar-actions">
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmingDelete(true)}
              title="Delete ticket"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginRight: 4 }}>
                <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3 3.5l.5 8.5a.5.5 0 00.5.5h6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
            <button className="btn btn-icon btn-ghost" onClick={closeTicket} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── Status row ── */}
        <div className="ticket-drawer-status-row">
          <StatusPill
            columnId={ticket.columnId}
            onChange={id => updateTicket(ticket.id, { columnId: id })}
          />
        </div>

        {/* ── Body ── */}
        <div className="ticket-drawer-body">

          {/* ── Left column ── */}
          <div className="ticket-drawer-main">
            {editingTitle ? (
              <input
                className="form-input ticket-drawer-title-input"
                value={titleDraft}
                autoFocus
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              />
            ) : (
              <h2
                className="ticket-drawer-title"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {ticket.title}
              </h2>
            )}

            <div className="drawer-section">
              <div className="drawer-section-label">Description</div>
              <RichTextEditor
                key={ticket.id}
                value={ticket.description}
                onChange={html => updateTicket(ticket.id, { description: html })}
                placeholder="Add a description…"
              />
            </div>

            {!ticket.parentId && <SubtasksTable parentId={ticket.id} />}

            <LinkedItemsSection ticketId={ticket.id} />

            <ActivitySection ticketId={ticket.id} />
          </div>

          {/* ── Right sidebar ── */}
          <aside className="ticket-drawer-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-section-title">Details</div>

              <SidebarRow label="Epic">
                <select
                  className="form-input form-input-sm"
                  value={ticket.epicId ?? ''}
                  onChange={e => updateTicket(ticket.id, { epicId: e.target.value || undefined })}
                >
                  <option value="">— None —</option>
                  {epics.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.title}</option>
                  ))}
                </select>
              </SidebarRow>

              {epicObj && (
                <SidebarRow label="Team">
                  <span
                    className="sidebar-epic-chip"
                    style={{ background: epicObj.color + '22', color: epicObj.color, border: `1px solid ${epicObj.color}55` }}
                  >
                    {epicObj.title}
                  </span>
                </SidebarRow>
              )}

              <SidebarRow label="Labels">
                <div className="sidebar-tags">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`chip sidebar-tag-toggle${ticket.tagIds.includes(tag.id) ? ' sidebar-tag-toggle--active' : ''}`}
                      style={{
                        background: ticket.tagIds.includes(tag.id) ? tag.color + '22' : 'transparent',
                        color: tag.color,
                        border: `1px solid ${tag.color}55`,
                      }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {tags.length === 0 && <span className="text-subtle" style={{ fontSize: 12 }}>Add labels</span>}
                </div>
              </SidebarRow>

              <SidebarRow label="Due date">
                <input
                  type="date"
                  className="form-input form-input-sm"
                  value={ticket.dueDate ?? ''}
                  onChange={e => updateTicket(ticket.id, { dueDate: e.target.value || undefined })}
                />
              </SidebarRow>

              <SidebarRow label="Priority">
                <select
                  className="form-input form-input-sm"
                  value={ticket.priority ?? ''}
                  onChange={e => updateTicket(ticket.id, { priority: (e.target.value as Priority) || undefined })}
                  style={{ color: ticket.priority ? PRIORITY_COLORS[ticket.priority] : undefined }}
                >
                  <option value="">— None —</option>
                  {PRIORITIES.map(p => (
                    <option key={p} value={p} style={{ color: PRIORITY_COLORS[p] }}>
                      {PRIORITY_ICONS[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </SidebarRow>

              <SidebarRow label="Story pts">
                <input
                  type="number"
                  min={0}
                  className="form-input form-input-sm"
                  style={{ width: 70 }}
                  value={ticket.estimate ?? ''}
                  placeholder="—"
                  onChange={e => updateTicket(ticket.id, { estimate: e.target.value ? Number(e.target.value) : undefined })}
                />
              </SidebarRow>

              {parentTicket && (
                <SidebarRow label="Parent">
                  <button className="parent-link" onClick={() => openTicket(parentTicket.id)}>
                    {parentTicket.key}: {parentTicket.title}
                  </button>
                </SidebarRow>
              )}
            </div>

            <div className="sidebar-footer-info">
              <div>Created {new Date(ticket.createdAt).toLocaleDateString()}</div>
              <div>Updated {new Date(ticket.updatedAt).toLocaleDateString()}</div>
            </div>
          </aside>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Move to trash?"
          message={`"${ticket.title}" will be moved to the trash and permanently deleted after 30 days.`}
          confirmLabel="Move to trash"
          dangerous
          onConfirm={() => { trashTicket(ticket.id); closeTicket(); }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}

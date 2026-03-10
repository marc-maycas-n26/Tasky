import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../../store';
import type { Priority } from '../../types';
import { PRIORITIES, PRIORITY_COLORS, PRIORITY_ICONS } from '../../constants/priorities';
import { RichTextEditor } from './RichTextEditor';
import { StatusPill } from './StatusPill';
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

  const ticket = tickets.find(t => t.id === selectedTicketId);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const labelSearchRef = useRef<HTMLInputElement>(null);

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

  const toggleTag = useCallback((tagId: string) => {
    const tagIds = ticket!.tagIds.includes(tagId)
      ? ticket!.tagIds.filter(id => id !== tagId)
      : [...ticket!.tagIds, tagId];
    updateTicket(ticket!.id, { tagIds });
  }, [ticket, updateTicket]);

  useEffect(() => {
    if (!labelPickerOpen) { setLabelSearch(''); return; }
    setTimeout(() => labelSearchRef.current?.focus(), 0);
    function handleClick(e: MouseEvent) {
      if (labelPickerRef.current && !labelPickerRef.current.contains(e.target as Node)) {
        setLabelPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [labelPickerOpen]);

  return (
    <>
      <div className="overlay" onClick={closeTicket} />
      <div className="ticket-drawer" ref={drawerRef} role="dialog" aria-label="Ticket details">

        {/* ── Top bar ── */}
        <div className="ticket-drawer-topbar">
          <div className="ticket-drawer-breadcrumb">
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

              <SidebarRow label="Labels">
                <div className="sidebar-labels-row">
                  {ticket.tagIds.map(id => {
                    const tag = tags.find(t => t.id === id);
                    if (!tag) return null;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className="chip sidebar-label-chip"
                        style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}55` }}
                        onClick={() => toggleTag(tag.id)}
                        title="Remove label"
                      >
                        {tag.name}
                        <span className="sidebar-label-remove" aria-hidden="true">×</span>
                      </button>
                    );
                  })}
                  <div className="sidebar-label-picker-wrap" ref={labelPickerRef}>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost sidebar-label-add-btn"
                      onClick={() => setLabelPickerOpen(o => !o)}
                      title="Add label"
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {labelPickerOpen && (
                      <div className="sidebar-label-dropdown">
                        <div className="sidebar-label-search-wrap">
                          <input
                            ref={labelSearchRef}
                            className="sidebar-label-search"
                            placeholder="Search labels…"
                            value={labelSearch}
                            onChange={e => setLabelSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') setLabelPickerOpen(false); }}
                          />
                        </div>
                        <div className="sidebar-label-dropdown-list">
                          {tags.filter(t => t.name.toLowerCase().includes(labelSearch.toLowerCase())).length === 0 && (
                            <span className="sidebar-label-dropdown-empty">No labels found</span>
                          )}
                          {tags
                            .filter(t => t.name.toLowerCase().includes(labelSearch.toLowerCase()))
                            .map(tag => {
                              const active = ticket.tagIds.includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  className={`sidebar-label-option${active ? ' sidebar-label-option--active' : ''}`}
                                  onClick={() => { toggleTag(tag.id); setLabelSearch(''); }}
                                >
                                  <span className="sidebar-label-option-dot" style={{ background: tag.color }} />
                                  <span>{tag.name}</span>
                                  {active && <span className="sidebar-label-option-check">✓</span>}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
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

            </div>

            <div className="sidebar-footer-info">
              <div>Created {new Date(ticket.createdAt).toLocaleDateString('en-GB')}, {new Date(ticket.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>Updated {new Date(ticket.updatedAt).toLocaleDateString('en-GB')}, {new Date(ticket.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
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

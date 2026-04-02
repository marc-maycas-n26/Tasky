import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { ReleasedEpic, Ticket, Tag } from '../../types';
import { PRIORITY_COLORS, PRIORITY_ICONS } from '../../constants/priorities';
import { SidebarRow } from '../Common/SidebarRow';
import { ImageLightbox } from '../Ticket/ImageLightbox';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { DeleteReleasesDialog } from './DeleteReleasesDialog';
import { FilterDropdown } from '../Board/FilterDropdown';
import '../Ticket/TicketDrawer.css';
import './ReleasesPage.css';

function formatDay(isoDate: string): string {
  const d = new Date(isoDate);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${weekday}, ${d.toLocaleDateString('en-GB')}`;
}

function toDateKey(isoDate: string): string {
  // YYYY-MM-DD in local time
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface DayGroup {
  dateKey: string;
  label: string;
  releases: ReleasedEpic[];
}

export function ReleasesPage() {
  const releasedEpics = useStore(s => s.releasedEpics);
  const tags = useStore(s => s.tags);
  const deleteReleases = useStore(s => s.deleteReleases);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [epicFilter, setEpicFilter] = useState<Set<string>>(new Set());
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const epicOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color?: string }>();
    for (const r of releasedEpics) {
      if (!seen.has(r.epic.id)) {
        seen.set(r.epic.id, { id: r.epic.id, name: r.epic.title, color: r.epic.color ?? undefined });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [releasedEpics]);

  const filtered = useMemo(() => {
    let list = [...releasedEpics].sort(
      (a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime()
    );

    if (dateFrom) {
      const from = parseLocalDate(dateFrom);
      list = list.filter(r => new Date(toDateKey(r.releasedAt) + 'T00:00:00') >= from);
    }
    if (dateTo) {
      const to = parseLocalDate(dateTo);
      list = list.filter(r => new Date(toDateKey(r.releasedAt) + 'T00:00:00') <= to);
    }
    if (epicFilter.size > 0) {
      list = list.filter(r => epicFilter.has(r.epic.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.epic.title.toLowerCase().includes(q) ||
        r.tickets.some(t =>
          t.title.toLowerCase().includes(q) ||
          t.key.toLowerCase().includes(q) ||
          (t.description ?? '').replace(/<[^>]*>/g, ' ').toLowerCase().includes(q)
        )
      );
    }
    return list;
  }, [releasedEpics, search, dateFrom, dateTo, epicFilter]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, ReleasedEpic[]>();
    for (const r of filtered) {
      const key = toDateKey(r.releasedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([dateKey, releases]) => ({
      dateKey,
      label: formatDay(releases[0].releasedAt),
      releases,
    }));
  }, [filtered]);

  function toggleEpic(epicId: string) {
    setCollapsedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  }

  const hasFilters = search || dateFrom || dateTo || epicFilter.size > 0;

  return (
    <div className="page-container">
      <div className="page-header rl-page-header">
        <div className="rl-page-header-row">
          <h1 className="page-title">Releases</h1>
          {releasedEpics.length > 0 && (
            <button
              className="btn btn-secondary btn-sm rl-delete-btn"
              onClick={() => setShowDeleteDialog(true)}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 4h9M5.5 4V2.5h3V4M6 6.5v4M8 6.5v4M3.5 4l.5 7.5h6l.5-7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete releases
            </button>
          )}
        </div>
        <p className="page-subtitle">Completed epics and their tickets, grouped by release date.</p>
      </div>

      {/* Filters */}
      <div className="rl-filters">
        <div className="rl-search-wrap">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="rl-search-icon">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="rl-search-input"
            type="search"
            placeholder="Search epics or tickets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <FilterDropdown
          label="Epic"
          options={epicOptions}
          selected={epicFilter}
          onToggle={id => setEpicFilter(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          })}
        />

        <div className="rl-date-range">
          <label className="rl-date-label">From</label>
          <input
            className="rl-date-input"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <label className="rl-date-label">To</label>
          <input
            className="rl-date-input"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          {hasFilters && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setEpicFilter(new Set()); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {releasedEpics.length === 0 ? (
        <div className="card">
          <div className="card-empty">
            No releases yet. When all tickets in an epic are done, a Release button will appear on the epic header.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-empty">No releases match your filters.</div>
        </div>
      ) : (
        <div className="rl-day-list">
          {dayGroups.map(group => (
            <div key={group.dateKey} className="rl-day-group">
              <div className="rl-day-header">
                <span className="rl-day-label">{group.label}</span>
                <span className="rl-day-count">{group.releases.length} epic{group.releases.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="rl-epics">
                {group.releases.map(release => {
                  const isOpen = !collapsedEpics.has(release.epic.id);
                  const epicTags = [...new Set(release.tickets.flatMap(t => t.tagIds))]
                    .map(id => tags.find(tg => tg.id === id))
                    .filter(Boolean) as typeof tags;

                  return (
                    <div key={release.epic.id} className="rl-epic-card card">
                      <div
                        className="rl-epic-header"
                        onClick={() => toggleEpic(release.epic.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && toggleEpic(release.epic.id)}
                      >
                        <span className="rl-epic-toggle">
                          {isOpen ? (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4H2z" fill="currentColor"/></svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3V2z" fill="currentColor"/></svg>
                          )}
                        </span>

                        <span className="rl-epic-icon">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M2.5 1.5h9a1 1 0 011 1v10l-5.5-2.75L1.5 12.5v-10a1 1 0 011-1z" fill={release.epic.color ?? '#6554C0'} />
                          </svg>
                        </span>

                        <span className="rl-epic-title" style={{ color: release.epic.color ?? 'var(--color-text-primary)' }}>
                          {release.epic.title}
                        </span>

                        <span className="rl-epic-ticket-count">
                          {release.tickets.length} ticket{release.tickets.length !== 1 ? 's' : ''}
                        </span>

                        {epicTags.slice(0, 3).map(tag => (
                          <span
                            key={tag.id}
                            className="chip"
                            style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}55` }}
                          >
                            {tag.name}
                          </span>
                        ))}

                        <span className="rl-epic-released-at">
                          Released {new Date(release.releasedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <span className="rl-epic-done-badge">Released</span>
                      </div>

                      {isOpen && (
                        <div className="rl-ticket-list">
                          {release.tickets.length === 0 ? (
                            <div className="rl-ticket-empty">No tickets in this epic.</div>
                          ) : (
                            release.tickets.map(ticket => {
                              const ticketTags = ticket.tagIds
                                .map(id => tags.find(t => t.id === id))
                                .filter(Boolean) as typeof tags;
                              return (
                                <div key={ticket.id} className="rl-ticket-row rl-ticket-row--clickable" onClick={e => { e.stopPropagation(); setPreviewTicket(ticket); }}>
                                  <span className="rl-ticket-icon" aria-hidden="true">
                                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                      <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#5E6C84" strokeWidth="1.3" fill="none"/>
                                      <path d="M5 5h4M5 7h4M5 9h2" stroke="#5E6C84" strokeWidth="1" strokeLinecap="round"/>
                                    </svg>
                                  </span>
                                  <span className="rl-ticket-key">{ticket.key}</span>
                                  <span className="rl-ticket-title">{ticket.title}</span>
                                  <div className="rl-ticket-tags">
                                    {ticketTags.map(tag => (
                                      <span
                                        key={tag.id}
                                        className="chip"
                                        style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}55` }}
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="rl-ticket-done">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                      <path d="M2.5 6l2.5 2.5L9.5 4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Done
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewTicket && (
        <ReleasedTicketDrawer ticket={previewTicket} tags={tags} onClose={() => setPreviewTicket(null)} />
      )}

      {showDeleteDialog && (
        <DeleteReleasesDialog
          releases={[...releasedEpics].sort((a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime())}
          onConfirm={epicIds => { deleteReleases(epicIds); setShowDeleteDialog(false); }}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}

const SystemIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="var(--color-border)" strokeWidth="1.5" fill="var(--color-bg)"/>
    <path d="M6 9l2 2 4-4" stroke="var(--color-primary)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function renderSystemBody(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function ReleasedTicketDrawer({ ticket, tags, onClose }: { ticket: Ticket; tags: Tag[]; onClose: () => void }) {
  const epics = useStore(s => s.epics);
  const columns = useStore(s => s.columns);
  const allComments = useStore(s => s.comments);
  const restoreTicketFromRelease = useStore(s => s.restoreTicketFromRelease);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const ticketTags = ticket.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[];
  const targetColumn = columns.find(c => c.role === 'todo' && !c.isBacklog)
    ?? columns.filter(c => !c.isBacklog).sort((a, b) => a.order - b.order)[0];
  const epic = ticket.epicId ? epics.find(e => e.id === ticket.epicId) : undefined;

  const comments = [...allComments.filter(c => c.ticketId === ticket.id)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function handleCommentClick(e: React.MouseEvent) {
    const img = (e.target as HTMLElement).closest('img');
    if (img) setLightboxSrc((img as HTMLImageElement).src);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="ticket-drawer" role="dialog" aria-label="Ticket details">

        {/* ── Top bar ── */}
        <div className="ticket-drawer-topbar">
          <div className="ticket-drawer-breadcrumb">
            <span className="breadcrumb-current">{ticket.key}</span>
          </div>
          <div className="ticket-drawer-topbar-actions">
            <span className="rl-archived-badge">Archived</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmRestore(true)}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginRight: 4 }}>
                <path d="M2 7a5 5 0 1 0 1.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M2 3.5V7h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Restore to board
            </button>
            <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── Status row ── */}
        <div className="ticket-drawer-status-row">
          <span className="rl-status-readonly">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 6l2.5 2.5L9.5 4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Done
          </span>
        </div>

        {/* ── Body ── */}
        <div className="ticket-drawer-body">

          {/* ── Left column ── */}
          <div className="ticket-drawer-main">
            <h2 className="ticket-drawer-title" style={{ cursor: 'default' }}>
              {ticket.title}
            </h2>

            <div className="drawer-section">
              <div className="drawer-section-label">Description</div>
              {ticket.description && ticket.description !== '<p></p>' ? (
                <div className="rte-content rte-root rte-root--readonly" dangerouslySetInnerHTML={{ __html: ticket.description }} />
              ) : (
                <span style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>No description.</span>
              )}
            </div>

            <div className="activity-section">
              <div className="activity-section-header">
                <span className="activity-header">Activity</span>
              </div>
              {comments.length > 0 ? (
                <div className="comment-list">
                  {comments.map(c => c.isSystem ? (
                    <div key={c.id} className="system-event-row">
                      <span className="system-event-icon"><SystemIcon /></span>
                      <span className="system-event-body">{renderSystemBody(c.body)}</span>
                      <span className="system-event-time">{new Date(c.createdAt).toLocaleDateString('en-GB') + ', ' + new Date(c.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ) : (
                    <div key={c.id} className="comment-row">
                      <div className="comment-body-wrap">
                        <div className="comment-meta">
                          <span className="comment-author">You</span>
                          <span className="comment-time">{new Date(c.createdAt).toLocaleDateString('en-GB') + ', ' + new Date(c.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          {c.updatedAt !== c.createdAt && <span className="comment-edited">(edited)</span>}
                        </div>
                        <div className="comment-body rte-content" dangerouslySetInnerHTML={{ __html: c.body }} onClick={handleCommentClick} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="activity-hint">No activity recorded.</p>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <aside className="ticket-drawer-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-section-title">Details</div>

              <SidebarRow label="Epic">
                {epic ? (
                  <span style={{ fontSize: 'var(--font-size-sm)', color: epic.color ?? 'var(--color-text-primary)', fontWeight: 500 }}>
                    {epic.title}
                  </span>
                ) : (
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)' }}>None</span>
                )}
              </SidebarRow>

              <SidebarRow label="Labels">
                <div className="sidebar-labels-row">
                  {ticketTags.length > 0 ? ticketTags.map(tag => (
                    <span
                      key={tag.id}
                      className="chip"
                      style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}55` }}
                    >
                      {tag.name}
                    </span>
                  )) : (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)' }}>None</span>
                  )}
                </div>
              </SidebarRow>

              <SidebarRow label="Due date">
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  {ticket.dueDate
                    ? new Date(ticket.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                    : <span style={{ color: 'var(--color-text-subtle)' }}>None</span>
                  }
                </span>
              </SidebarRow>

              <SidebarRow label="Priority">
                {ticket.priority ? (
                  <span style={{ fontSize: 'var(--font-size-sm)', color: PRIORITY_COLORS[ticket.priority], fontWeight: 500 }}>
                    {PRIORITY_ICONS[ticket.priority]} {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </span>
                ) : (
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)' }}>None</span>
                )}
              </SidebarRow>
            </div>

            <div className="sidebar-footer-info">
              <div>Created {new Date(ticket.createdAt).toLocaleDateString('en-GB')}, {new Date(ticket.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>Updated {new Date(ticket.updatedAt).toLocaleDateString('en-GB')}, {new Date(ticket.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </aside>
        </div>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {confirmRestore && (
        <ConfirmDialog
          title="Restore ticket to board?"
          message={`"${ticket.title}" will be removed from this release and placed in "${targetColumn?.name ?? 'To Do'}". This will affect the release history.`}
          confirmLabel="Restore to board"
          onConfirm={() => { restoreTicketFromRelease(ticket.id); onClose(); }}
          onCancel={() => setConfirmRestore(false)}
        />
      )}
    </>
  );
}

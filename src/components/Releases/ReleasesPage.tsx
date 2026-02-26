import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import type { ReleasedEpic } from '../../types';
import './ReleasesPage.css';

function formatDay(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

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
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.epic.title.toLowerCase().includes(q) ||
        r.tickets.some(t => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q))
      );
    }
    return list;
  }, [releasedEpics, search, dateFrom, dateTo]);

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
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  }

  const hasFilters = search || dateFrom || dateTo;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Releases</h1>
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
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
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
                  const isOpen = expandedEpics.has(release.epic.id);
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
                                <div key={ticket.id} className="rl-ticket-row">
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
    </div>
  );
}

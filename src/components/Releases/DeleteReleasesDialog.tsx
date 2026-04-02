import { useState, useMemo, useRef } from 'react';
import type { ReleasedEpic } from '../../types';
import './DeleteReleasesDialog.css';

const PHRASE_POOL = [
  'delete this forever',
  'gone and forgotten',
  'no going back now',
  'wipe it clean',
  'erase this release',
  'clear the archive',
  'permanently remove',
  'this cannot be undone',
  'say goodbye',
  'vanish into thin air',
  'burn the records',
  'release into the void',
  'empty the vault',
  'close the chapter',
  'farewell old data',
];

function randomPhrase(): string {
  return PHRASE_POOL[Math.floor(Math.random() * PHRASE_POOL.length)];
}

function toDateKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDay(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

interface DateGroup {
  dateKey: string;
  label: string;
  releases: ReleasedEpic[];
}

interface Props {
  releases: ReleasedEpic[];
  onConfirm: (epicIds: string[]) => void;
  onCancel: () => void;
}

export function DeleteReleasesDialog({ releases, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmPhrase, setConfirmPhrase] = useState<string | null>(null);
  const [phraseInput, setPhraseInput] = useState('');
  const lastClickedIndex = useRef<number | null>(null);

  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, ReleasedEpic[]>();
    for (const r of releases) {
      const key = toDateKey(r.releasedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, group]) => ({
        dateKey,
        label: formatDay(group[0].releasedAt),
        releases: group,
      }));
  }, [releases]);

  const selectedGroups = dateGroups.filter(g => selected.has(g.dateKey));
  const totalSelectedEpics = selectedGroups.reduce((n, g) => n + g.releases.length, 0);
  const allSelected = selected.size === dateGroups.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(dateGroups.map(g => g.dateKey)));
    lastClickedIndex.current = null;
  }

  function handleRowClick(dateKey: string, index: number, e: React.MouseEvent) {
    if (e.shiftKey && lastClickedIndex.current !== null) {
      const from = Math.min(lastClickedIndex.current, index);
      const to = Math.max(lastClickedIndex.current, index);
      setSelected(prev => {
        const next = new Set(prev);
        for (let i = from; i <= to; i++) next.add(dateGroups[i].dateKey);
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(dateKey)) next.delete(dateKey);
        else next.add(dateKey);
        return next;
      });
      lastClickedIndex.current = index;
    }
  }

  function handleDeleteClick() {
    setConfirmPhrase(randomPhrase());
    setPhraseInput('');
  }

  const selectedEpicIds = selectedGroups.flatMap(g => g.releases.map(r => r.epic.id));
  const phraseMatches = phraseInput.trim().toLowerCase() === confirmPhrase;

  return (
    <>
      <div className="overlay" onClick={onCancel} />
      <div className="del-releases-dialog" role="dialog" aria-modal="true" aria-label="Delete releases">
        <div className="del-releases-header">
          <h2 className="del-releases-title">Delete releases</h2>
          <button className="btn btn-icon btn-ghost" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        {confirmPhrase ? (
          /* ── Confirmation step ── */
          <>
            <div className="del-releases-confirm-step">
              <p className="del-releases-confirm-desc">
                You are about to permanently delete <strong>{selectedGroups.length} release{selectedGroups.length !== 1 ? 's' : ''}</strong>. This cannot be undone.
              </p>
              <p className="del-releases-phrase-label">
                Type <strong>{confirmPhrase}</strong> to confirm
              </p>
              <input
                className={`form-input del-releases-phrase-input${phraseMatches ? ' del-releases-phrase-input--ok' : ''}`}
                type="text"
                placeholder={confirmPhrase}
                value={phraseInput}
                onChange={e => setPhraseInput(e.target.value)}
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="del-releases-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmPhrase(null)}>Back</button>
              <button
                className="btn btn-danger"
                disabled={!phraseMatches}
                onClick={() => onConfirm(selectedEpicIds)}
              >
                Delete {selectedGroups.length} release{selectedGroups.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        ) : (
          /* ── Selection step ── */
          <>
            <p className="del-releases-intro">
              Select the release dates to delete. Shift+click to select a range. Open board and backlog tickets are not affected.
            </p>

            <div className="del-releases-list">
              <label className="del-releases-select-all">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                <span>Select all ({dateGroups.length} date{dateGroups.length !== 1 ? 's' : ''})</span>
              </label>

              {dateGroups.map((g, i) => {
                const isChecked = selected.has(g.dateKey);
                const totalTickets = g.releases.reduce((n, r) => n + r.tickets.length, 0);
                return (
                  <div
                    key={g.dateKey}
                    className={`del-releases-item${isChecked ? ' del-releases-item--selected' : ''}`}
                    onClick={e => handleRowClick(g.dateKey, i, e)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={e => e.key === ' ' && (e.preventDefault(), handleRowClick(g.dateKey, i, { shiftKey: e.shiftKey } as React.MouseEvent))}
                  >
                    <span className={`del-releases-checkbox${isChecked ? ' del-releases-checkbox--checked' : ''}`} aria-hidden="true" />
                    <span className="del-releases-date-label">{g.label}</span>
                    <span className="del-releases-epic-meta">
                      {g.releases.length} epic{g.releases.length !== 1 ? 's' : ''} · {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="del-releases-footer">
              <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={selected.size === 0}
                onClick={handleDeleteClick}
              >
                Delete {selected.size > 0
                  ? `${selected.size} release${selected.size !== 1 ? 's' : ''}`
                  : 'releases'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

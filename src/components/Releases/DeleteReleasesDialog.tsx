import { useState, useMemo } from 'react';
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

function pickPhrase(dateKey: string, index: number): string {
  return PHRASE_POOL[(index * 3 + dateKey.charCodeAt(0)) % PHRASE_POOL.length];
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
  // selected = set of dateKeys
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inputs, setInputs] = useState<Record<string, string>>({});

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

  const requiredPhrases = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    dateGroups.forEach((g, i) => {
      map[g.dateKey] = pickPhrase(g.dateKey, i);
    });
    return map;
  }, [dateGroups]);

  const selectedGroups = dateGroups.filter(g => selected.has(g.dateKey));
  const totalSelectedEpics = selectedGroups.reduce((n, g) => n + g.releases.length, 0);

  const allConfirmed = selectedGroups.length > 0 && selectedGroups.every(
    g => (inputs[g.dateKey] ?? '').trim().toLowerCase() === requiredPhrases[g.dateKey]
  );

  const allSelected = selected.size === dateGroups.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(dateGroups.map(g => g.dateKey)));
    }
  }

  function toggleGroup(dateKey: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
        setInputs(inp => { const n = { ...inp }; delete n[dateKey]; return n; });
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  const selectedEpicIds = selectedGroups.flatMap(g => g.releases.map(r => r.epic.id));

  return (
    <>
      <div className="overlay" onClick={onCancel} />
      <div className="del-releases-dialog" role="dialog" aria-modal="true" aria-label="Delete releases">
        <div className="del-releases-header">
          <h2 className="del-releases-title">Delete releases</h2>
          <button className="btn btn-icon btn-ghost" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <p className="del-releases-intro">
          Select the release dates to permanently delete. Their tickets and activity will be removed from the archive and from storage. Open board and backlog tickets are not affected.
        </p>

        <div className="del-releases-list">
          <label className="del-releases-select-all">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>Select all ({dateGroups.length} date{dateGroups.length !== 1 ? 's' : ''})</span>
          </label>

          {dateGroups.map(g => {
            const isChecked = selected.has(g.dateKey);
            const phrase = requiredPhrases[g.dateKey];
            const inputVal = inputs[g.dateKey] ?? '';
            const confirmed = inputVal.trim().toLowerCase() === phrase;
            const totalTickets = g.releases.reduce((n, r) => n + r.tickets.length, 0);

            return (
              <div key={g.dateKey} className={`del-releases-item${isChecked ? ' del-releases-item--selected' : ''}`}>
                <label className="del-releases-item-check">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleGroup(g.dateKey)}
                  />
                  <span className="del-releases-date-label">{g.label}</span>
                  <span className="del-releases-epic-meta">
                    {g.releases.length} epic{g.releases.length !== 1 ? 's' : ''} · {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
                  </span>
                </label>

                {/* Epic list inside the date group */}
                <div className="del-releases-epics">
                  {g.releases.map(r => (
                    <div key={r.epic.id} className="del-releases-epic-row">
                      <span
                        className="del-releases-epic-dot"
                        style={{ background: r.epic.color ?? '#6554C0' }}
                      />
                      <span className="del-releases-epic-name">{r.epic.title}</span>
                      <span className="del-releases-epic-meta">
                        {r.tickets.length} ticket{r.tickets.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {isChecked && (
                  <div className="del-releases-confirm-row">
                    <p className="del-releases-phrase-label">
                      Type <strong>{phrase}</strong> to confirm
                    </p>
                    <input
                      className={`form-input del-releases-phrase-input${confirmed ? ' del-releases-phrase-input--ok' : ''}`}
                      type="text"
                      placeholder={phrase}
                      value={inputVal}
                      onChange={e => setInputs(inp => ({ ...inp, [g.dateKey]: e.target.value }))}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="del-releases-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-danger"
            disabled={!allConfirmed}
            onClick={() => onConfirm(selectedEpicIds)}
          >
            Delete {totalSelectedEpics > 0
              ? `${totalSelectedEpics} epic${totalSelectedEpics !== 1 ? 's' : ''}`
              : 'releases'}
          </button>
        </div>
      </div>
    </>
  );
}

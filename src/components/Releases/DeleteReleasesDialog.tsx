import { useState, useMemo } from 'react';
import type { ReleasedEpic } from '../../types';
import './DeleteReleasesDialog.css';

// Short, memorable phrases — one per selected release
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

function pickPhrase(epicId: string, index: number): string {
  // Deterministic per-epic phrase derived from the index
  return PHRASE_POOL[(index * 3 + epicId.charCodeAt(0)) % PHRASE_POOL.length];
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  releases: ReleasedEpic[];
  onConfirm: (epicIds: string[]) => void;
  onCancel: () => void;
}

export function DeleteReleasesDialog({ releases, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const selectedList = useMemo(
    () => releases.filter(r => selected.has(r.epic.id)),
    [releases, selected]
  );

  // Map each selected release to its required confirmation phrase
  const requiredPhrases = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    selectedList.forEach((r, i) => {
      map[r.epic.id] = pickPhrase(r.epic.id, i);
    });
    return map;
  }, [selectedList]);

  const allConfirmed = selectedList.length > 0 && selectedList.every(
    r => (inputs[r.epic.id] ?? '').trim().toLowerCase() === requiredPhrases[r.epic.id]
  );

  const allSelected = selected.size === releases.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(releases.map(r => r.epic.id)));
    }
  }

  function toggle(epicId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
        setInputs(inp => { const n = { ...inp }; delete n[epicId]; return n; });
      } else {
        next.add(epicId);
      }
      return next;
    });
  }

  return (
    <>
      <div className="overlay" onClick={onCancel} />
      <div className="del-releases-dialog" role="dialog" aria-modal="true" aria-label="Delete releases">
        <div className="del-releases-header">
          <h2 className="del-releases-title">Delete releases</h2>
          <button className="btn btn-icon btn-ghost" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <p className="del-releases-intro">
          Select the releases to permanently delete. Their tickets and activity will be removed from the archive and from storage. Open board and backlog tickets are not affected.
        </p>

        {/* Release list */}
        <div className="del-releases-list">
          <label className="del-releases-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span>Select all ({releases.length})</span>
          </label>

          {releases.map(r => {
            const isChecked = selected.has(r.epic.id);
            const phrase = requiredPhrases[r.epic.id];
            const inputVal = inputs[r.epic.id] ?? '';
            const confirmed = inputVal.trim().toLowerCase() === phrase;

            return (
              <div key={r.epic.id} className={`del-releases-item${isChecked ? ' del-releases-item--selected' : ''}`}>
                <label className="del-releases-item-check">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(r.epic.id)}
                  />
                  <span
                    className="del-releases-epic-dot"
                    style={{ background: r.epic.color ?? '#6554C0' }}
                  />
                  <span className="del-releases-epic-name">{r.epic.title}</span>
                  <span className="del-releases-epic-meta">
                    {r.tickets.length} ticket{r.tickets.length !== 1 ? 's' : ''} · released {formatDate(r.releasedAt)}
                  </span>
                </label>

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
                      onChange={e => setInputs(inp => ({ ...inp, [r.epic.id]: e.target.value }))}
                      autoFocus={selectedList[0]?.epic.id === r.epic.id}
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
            onClick={() => onConfirm(Array.from(selected))}
          >
            Delete {selected.size > 0 ? `${selected.size} release${selected.size !== 1 ? 's' : ''}` : 'releases'}
          </button>
        </div>
      </div>
    </>
  );
}

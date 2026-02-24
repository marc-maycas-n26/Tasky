import { useState } from 'react';
import { useStore } from '../../store';
import type { LinkedItemRelation } from '../../types';
import { PRIORITY_COLORS, PRIORITY_ICONS } from '../../constants/priorities';

const RELATION_OPTIONS: LinkedItemRelation[] = [
  'clones', 'is cloned by', 'relates to', 'blocks', 'is blocked by',
];

interface Props {
  ticketId: string;
}

export function LinkedItemsSection({ ticketId }: Props) {
  const linkedItems = useStore(s => s.linkedItems);
  const addLinkedItem = useStore(s => s.addLinkedItem);
  const deleteLinkedItem = useStore(s => s.deleteLinkedItem);
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);

  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newRelation, setNewRelation] = useState<LinkedItemRelation>('relates to');

  const items = linkedItems.filter(l => l.ticketId === ticketId);
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.relation] ??= []).push(item);
    return acc;
  }, {});

  function handleAdd() {
    if (!newKey.trim()) return;
    const target = tickets.find(t => t.key.toLowerCase() === newKey.trim().toLowerCase());
    addLinkedItem(ticketId, newKey.trim().toUpperCase(), target?.title ?? newKey.trim(), newRelation);
    setNewKey('');
    setAdding(false);
  }

  function getStatusLabel(key: string): string | null {
    const t = tickets.find(t => t.key === key);
    if (!t) return null;
    return columns.find(c => c.id === t.columnId)?.name ?? null;
  }

  return (
    <div className="linked-section">
      <div className="linked-section-header">
        <span className="linked-section-title">Linked work items</span>
        <button
          className="btn btn-icon btn-ghost btn-sm"
          onClick={() => setAdding(a => !a)}
          title="Add link"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {adding && (
        <div className="linked-add-row">
          <select
            className="form-input form-input-sm"
            value={newRelation}
            onChange={e => setNewRelation(e.target.value as LinkedItemRelation)}
            style={{ width: 140 }}
          >
            {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input
            className="form-input form-input-sm"
            placeholder="Ticket key (e.g. TM-5)"
            value={newKey}
            autoFocus
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setAdding(false);
            }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>Link</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}

      {Object.entries(grouped).map(([relation, groupItems]) => (
        <div key={relation} className="linked-group">
          <div className="linked-group-label">{relation}</div>
          {groupItems.map(item => {
            const statusLabel = getStatusLabel(item.targetKey);
            const t = tickets.find(t => t.key === item.targetKey);
            return (
              <div key={item.id} className="linked-item-row">
                <span className="linked-item-icon">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="#5E6C84" strokeWidth="1.2" fill="none"/>
                    <path d="M3 4h6M3 6h6M3 8h4" stroke="#5E6C84" strokeWidth="0.9" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="linked-item-key">{item.targetKey}</span>
                <span className="linked-item-title">{item.targetTitle}</span>
                {statusLabel && (
                  <span className="linked-item-status">{statusLabel.toUpperCase()}</span>
                )}
                {t?.priority && (
                  <span style={{ color: PRIORITY_COLORS[t.priority], fontSize: 12 }}>
                    {PRIORITY_ICONS[t.priority]}
                  </span>
                )}
                <button
                  className="btn btn-icon btn-ghost btn-sm"
                  onClick={() => deleteLinkedItem(item.id)}
                  title="Remove"
                  style={{ marginLeft: 'auto' }}
                >✕</button>
              </div>
            );
          })}
        </div>
      ))}

      {items.length === 0 && !adding && (
        <p className="linked-empty">No linked items.</p>
      )}
    </div>
  );
}

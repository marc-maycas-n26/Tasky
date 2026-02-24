import { useState } from 'react';
import { useStore } from '../../store';

function getStatusClass(name: string): string {
  const n = name.toLowerCase();
  if (n === 'done') return 'status-pill--done';
  if (n.includes('progress')) return 'status-pill--inprogress';
  if (n.includes('review')) return 'status-pill--review';
  if (n === 'blocked') return 'status-pill--blocked';
  return 'status-pill--todo';
}

interface Props {
  columnId: string;
  onChange: (columnId: string) => void;
}

export function StatusPill({ columnId, onChange }: Props) {
  const columns = useStore(s => s.columns);
  const [open, setOpen] = useState(false);

  const col = columns.find(c => c.id === columnId);
  const sorted = [...columns].sort((a, b) => a.order - b.order);

  return (
    <div className="status-pill-wrapper">
      <button
        className={`status-pill ${getStatusClass(col?.name ?? '')}`}
        onClick={() => setOpen(o => !o)}
      >
        {col?.name ?? '—'}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="status-pill-backdrop" onClick={() => setOpen(false)} />
          <div className="status-pill-menu">
            {sorted.map(c => (
              <button
                key={c.id}
                className={`status-pill-option ${getStatusClass(c.name)}${c.id === columnId ? ' status-pill-option--active' : ''}`}
                onClick={() => { onChange(c.id); setOpen(false); }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

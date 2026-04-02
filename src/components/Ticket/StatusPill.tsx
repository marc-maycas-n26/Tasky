import { useState } from 'react';
import { useStore } from '../../store';
import { getColumnColor } from '../../utils/columnColor';

interface Props {
  columnId: string;
  onChange: (columnId: string) => void;
}

export function StatusPill({ columnId, onChange }: Props) {
  const columns = useStore(s => s.columns);
  const [open, setOpen] = useState(false);

  const col = columns.find(c => c.id === columnId);
  const sorted = [...columns].sort((a, b) => a.order - b.order);

  const pillStyle = col ? {
    background: getColumnColor(col) + '1a',
    color: getColumnColor(col),
  } : undefined;

  return (
    <div className="status-pill-wrapper">
      <button
        className="status-pill"
        style={pillStyle}
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
            {sorted.map(c => {
              const hex = getColumnColor(c);
              return (
                <button
                  key={c.id}
                  className={`status-pill-option${c.id === columnId ? ' status-pill-option--active' : ''}`}
                  style={{ background: hex + '1a', color: hex }}
                  onClick={() => { onChange(c.id); setOpen(false); }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

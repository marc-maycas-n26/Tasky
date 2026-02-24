import { useRef, useState } from 'react';

interface Option {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function FilterDropdown({ label, options, selected, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCount = selected.size;

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        className={`btn btn-secondary btn-sm filter-btn${activeCount > 0 ? ' filter-btn--active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {label}
        {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="filter-backdrop" onClick={() => setOpen(false)} />
          <div className="filter-menu">
            {options.map(opt => (
              <label key={opt.id} className="filter-option">
                <input
                  type="checkbox"
                  checked={selected.has(opt.id)}
                  onChange={() => onToggle(opt.id)}
                />
                {opt.color && (
                  <span className="filter-option-dot" style={{ background: opt.color }} />
                )}
                <span>{opt.name}</span>
              </label>
            ))}
            {options.length === 0 && (
              <div className="filter-empty">No options</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

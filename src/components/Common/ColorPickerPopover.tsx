import { useEffect, useRef, useState } from 'react';
import './ColorPickerPopover.css';

export const PRESET_COLORS = [
  // Reds & pinks
  '#E53E3E', '#ED64A6', '#D53F8C',
  // Oranges & browns
  '#ED8936', '#C05621', '#7B341E',
  // Yellows
  '#ECC94B', '#D69E2E', '#B7791F',
  // Greens
  '#48BB78', '#38A169', '#276749',
  // Teals & cyans
  '#38B2AC', '#0097A7', '#00BCD4',
  // Blues
  '#4299E1', '#3182CE', '#0052CC',
  // Indigos & purples
  '#667EEA', '#6B46C1', '#553C9A',
  // Magentas & violets
  '#9F7AEA', '#B83280', '#702459',
  // Greys
  '#A0AEC0', '#718096', '#2D3748',
];

interface Props {
  value: string;
  onChange: (color: string) => void;
  size?: number;
}

export function ColorPickerPopover({ value, onChange, size = 28 }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openPopover() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        // Check if click is inside the fixed popover (identified by class)
        const popover = document.querySelector('.cpp-popover');
        if (!popover || !popover.contains(target)) setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="cpp-wrapper">
      <button
        ref={triggerRef}
        type="button"
        className="cpp-trigger"
        style={{ background: value, width: size, height: size }}
        onClick={openPopover}
        title="Pick a color"
        aria-haspopup="true"
        aria-expanded={open}
      />
      {open && (
        <div
          className="cpp-popover"
          role="dialog"
          aria-label="Color picker"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="cpp-swatches">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`cpp-swatch${value === c ? ' cpp-swatch--selected' : ''}`}
                style={{ background: c }}
                onClick={() => { onChange(c); setOpen(false); }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

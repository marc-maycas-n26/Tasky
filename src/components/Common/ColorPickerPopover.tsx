import { useEffect, useRef, useState } from 'react';
import './ColorPickerPopover.css';

export const PRESET_COLORS = [
  '#0052CC', '#0065FF', '#4C9AFF',
  '#00875A', '#36B37E', '#57D9A3',
  '#FF5630', '#DE350B', '#FF7452',
  '#FF991F', '#FF8B00', '#FFC400',
  '#6554C0', '#8777D9', '#998DD9',
  '#97A0AF', '#5E6C84', '#344563',
];

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPickerPopover({ value, onChange }: Props) {
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
        style={{ background: value }}
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

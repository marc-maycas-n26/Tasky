import { useEffect, useRef, useState } from 'react';
import './ColorPickerPopover.css';

const PRESET_COLORS = [
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="cpp-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="cpp-trigger"
        style={{ background: value }}
        onClick={() => setOpen(v => !v)}
        title="Pick a color"
        aria-haspopup="true"
        aria-expanded={open}
      />
      {open && (
        <div className="cpp-popover" role="dialog" aria-label="Color picker">
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

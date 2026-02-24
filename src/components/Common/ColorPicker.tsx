import './ColorPicker.css';

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

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="color-picker">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          className={`color-swatch${value === c ? ' color-swatch--selected' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
      <input
        type="color"
        className="color-input-native"
        value={value}
        onChange={e => onChange(e.target.value)}
        title="Custom color"
      />
    </div>
  );
}

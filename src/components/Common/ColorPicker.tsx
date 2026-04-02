import './ColorPicker.css';

const PRESET_COLORS = [
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

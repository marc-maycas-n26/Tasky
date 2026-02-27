import { useStore } from '../../store';

type ThemeOption = 'light' | 'dark' | 'system';

const OPTIONS: { value: ThemeOption; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark',  label: 'Dark',  icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export function AppearanceSection() {
  const theme = useStore(s => s.settings.theme ?? 'system');
  const updateSettings = useStore(s => s.updateSettings);

  return (
    <div className="card">
      <div className="card-header">Appearance</div>
      <div className="card-body">
        <div className="settings-field">
          <label className="form-label">Theme</label>
          <div className="theme-toggle">
            {OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`theme-toggle-btn${theme === opt.value ? ' theme-toggle-btn--active' : ''}`}
                onClick={() => updateSettings({ theme: opt.value })}
              >
                <span className="theme-toggle-icon">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
          <p className="settings-hint">
            System follows your OS preference. Light and Dark override it.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '../../store';

export function GeneralSection() {
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  const [key, setKey] = useState(settings.projectKey);

  function handleSave() {
    const trimmed = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!trimmed) return;
    updateSettings({ projectKey: trimmed });
  }

  return (
    <div className="card">
      <div className="card-header">General</div>
      <div className="card-body">
        <div className="settings-field">
          <label className="form-label" htmlFor="project-key">Ticket key prefix</label>
          <div className="settings-row">
            <input
              id="project-key"
              className="form-input"
              value={key}
              maxLength={6}
              style={{ width: 120 }}
              onChange={e => setKey(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
          </div>
          <p className="settings-hint">Used as the prefix for ticket keys (e.g. TM-1). Max 6 characters.</p>
        </div>
      </div>
    </div>
  );
}

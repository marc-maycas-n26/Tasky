import { useRef, useState } from 'react';
import { useStore } from '../../store';
import { GoogleDriveAdapter } from '../../storage/googleDrive';
import { IndexedDbAdapter } from '../../storage/indexedDb';
import type { AppState } from '../../types';

export function StorageSection() {
  const settings = useStore(s => s.settings);
  const exportState = useStore(s => s.exportState);
  const importState = useStore(s => s.importState);
  const updateSettings = useStore(s => s.updateSettings);
  const setAdapter = useStore(s => s.setAdapter);
  const init = useStore(s => s.init);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gdStatus, setGdStatus] = useState<'idle' | 'connecting' | 'syncing' | 'error'>('idle');
  const [gdError, setGdError] = useState('');
  const [importError, setImportError] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const gdConnected = settings.googleDrive?.connected ?? false;

  function handleExport() {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antigravity-tasks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setImportError('');
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as AppState;
      if (!data.schemaVersion || !Array.isArray(data.columns)) {
        throw new Error('Invalid file format');
      }
      await importState(data);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import');
    } finally {
      e.target.value = '';
    }
  }

  async function handleGdConnect() {
    if (!clientId) {
      setGdError('VITE_GOOGLE_CLIENT_ID is not set in .env.local');
      return;
    }
    setGdStatus('connecting');
    setGdError('');
    try {
      const fileId = settings.googleDrive?.fileId;
      const adapter = new GoogleDriveAdapter(clientId, fileId);
      await adapter.authenticate();
      setAdapter(adapter);
      setGdStatus('syncing');
      await init();
      updateSettings({
        googleDrive: {
          connected: true,
          fileId: adapter.getFileId() ?? undefined,
          lastSyncAt: new Date().toISOString(),
          autoSync: settings.googleDrive?.autoSync ?? false,
        },
      });
      setGdStatus('idle');
    } catch (err) {
      setGdStatus('error');
      setGdError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  function handleGdDisconnect() {
    setAdapter(new IndexedDbAdapter());
    updateSettings({ googleDrive: { connected: false, autoSync: false } });
    setGdStatus('idle');
  }

  return (
    <div className="card">
      <div className="card-header">Storage &amp; Data</div>
      <div className="card-body settings-storage-body">

        <div className="settings-storage-section">
          <h3 className="settings-section-label">Local backup</h3>
          <div className="settings-row">
            <button className="btn btn-secondary" onClick={handleExport}>Export JSON</button>
            <button className="btn btn-secondary" onClick={handleImportClick}>Import JSON</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </div>
          {importError && <p className="settings-error">{importError}</p>}
          <p className="settings-hint">
            Export saves a full snapshot of all your data. Importing replaces the current data.
          </p>
        </div>

        <div className="settings-divider" />

        <div className="settings-storage-section">
          <h3 className="settings-section-label">Google Drive sync</h3>
          {!clientId && (
            <p className="settings-warn">
              Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env.local</code> to enable Google Drive sync.
            </p>
          )}
          {clientId && (
            <>
              {gdConnected ? (
                <div className="settings-gd-connected">
                  <span className="gd-status-dot gd-status-dot--on" />
                  <span>Connected</span>
                  {settings.googleDrive?.lastSyncAt && (
                    <span className="text-subtle" style={{ marginLeft: 8 }}>
                      Last sync: {new Date(settings.googleDrive.lastSyncAt).toLocaleString()}
                    </span>
                  )}
                  <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={handleGdDisconnect}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="settings-row">
                  <button
                    className="btn btn-primary"
                    onClick={handleGdConnect}
                    disabled={gdStatus === 'connecting' || gdStatus === 'syncing'}
                  >
                    {gdStatus === 'connecting' ? 'Connecting…' : gdStatus === 'syncing' ? 'Syncing…' : 'Connect Google Drive'}
                  </button>
                </div>
              )}
              {gdError && <p className="settings-error">{gdError}</p>}
              <p className="settings-hint">
                Stores your data as <code>antigravity-tasks.json</code> in your Google Drive.
                Requires a Client ID with the Drive API enabled.{' '}
                See the README for setup instructions.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

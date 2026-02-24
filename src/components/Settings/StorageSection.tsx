import { useRef, useState } from 'react';
import { useStore } from '../../store';
import { MarkdownFsAdapter, saveDirectoryHandle, clearDirectoryHandle } from '../../storage/markdownFs';
import { IndexedDbAdapter, clearAppDatabase } from '../../storage/indexedDb';
import type { AppState } from '../../types';

const FS_SUPPORTED = 'showDirectoryPicker' in window;

export function StorageSection() {
  const settings = useStore(s => s.settings);
  const exportState = useStore(s => s.exportState);
  const importState = useStore(s => s.importState);
  const updateSettings = useStore(s => s.updateSettings);
  const setAdapter = useStore(s => s.setAdapter);
  const adapter = useStore(s => s.adapter);
  const init = useStore(s => s.init);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fsStatus, setFsStatus] = useState<'idle' | 'picking' | 'loading' | 'error'>('idle');
  const [fsError, setFsError] = useState('');
  const [importError, setImportError] = useState('');

  const folderConnected = adapter instanceof MarkdownFsAdapter;
  const folderName = settings.markdownFolder?.folderName;

  // ── JSON export / import ──────────────────────────────────────────────────

  function handleExport() {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasky-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  // ── Markdown folder ───────────────────────────────────────────────────────

  async function handlePickFolder() {
    setFsStatus('picking');
    setFsError('');
    try {
      const dirHandle = await (window as Window & {
        showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker({ mode: 'readwrite' });

      setFsStatus('loading');
      await saveDirectoryHandle(dirHandle);
      await clearAppDatabase();
      const mdAdapter = new MarkdownFsAdapter(dirHandle);
      setAdapter(mdAdapter);
      await init();
      updateSettings({
        markdownFolder: { folderName: dirHandle.name },
      });
      setFsStatus('idle');
    } catch (err) {
      // User cancelled the picker — treat as idle, not an error
      if (err instanceof DOMException && err.name === 'AbortError') {
        setFsStatus('idle');
        return;
      }
      setFsStatus('error');
      setFsError(err instanceof Error ? err.message : 'Failed to open folder');
    }
  }

  async function handleDisconnect() {
    await clearDirectoryHandle();
    setAdapter(new IndexedDbAdapter());
    updateSettings({ markdownFolder: undefined });
    setFsStatus('idle');
    setFsError('');
    init();
  }

  return (
    <div className="card">
      <div className="card-header">Storage &amp; Data</div>
      <div className="card-body settings-storage-body">

        {/* ── Markdown folder ── */}
        <div className="settings-storage-section">
          <h3 className="settings-section-label">Markdown folder</h3>
          <p className="settings-hint">
            Each ticket is saved as a <code>.md</code> file in a folder you choose.
            Drop a <code>.md</code> file into the folder manually and it will appear
            as a ticket the next time you load the app.
            Works in Chrome and Edge. Requires the folder to stay accessible.
          </p>

          {!FS_SUPPORTED && (
            <p className="settings-warn">
              Your browser does not support the File System Access API.
              Please use Chrome or Edge to use this feature.
            </p>
          )}

          {FS_SUPPORTED && (
            <>
              {folderConnected ? (
                <div className="settings-gd-connected">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M1.5 8L4 11.5 12.5 2.5" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Connected to <strong>{folderName}</strong></span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="settings-row">
                  <button
                    className="btn btn-primary"
                    onClick={handlePickFolder}
                    disabled={fsStatus === 'picking' || fsStatus === 'loading'}
                  >
                    {fsStatus === 'picking'
                      ? 'Waiting for folder…'
                      : fsStatus === 'loading'
                      ? 'Loading…'
                      : 'Choose folder'}
                  </button>
                </div>
              )}
              {fsError && <p className="settings-error">{fsError}</p>}
            </>
          )}
        </div>

        <div className="settings-divider" />

        {/* ── Local backup ── */}
        <div className="settings-storage-section">
          <h3 className="settings-section-label">Backup</h3>
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
            Export saves a full snapshot of all your data. Importing replaces all current data.
          </p>
        </div>

      </div>
    </div>
  );
}

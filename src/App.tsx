import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { Nav } from './components/Common/Nav';
import { Board } from './components/Board/Board';
import { BacklogPage } from './components/Backlog/BacklogPage';
import { TagsPage } from './components/Tags/TagsPage';
import { TemplatesPage } from './components/Templates/TemplatesPage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { TrashPage } from './components/Trash/TrashPage';
import { ReleasesPage } from './components/Releases/ReleasesPage';
import { MarkdownFsAdapter, saveDirectoryHandle } from './storage/markdownFs';
import './App.css';

// ── Theme applicator ───────────────────────────────────────────────────────────

function ThemeApplicator() {
  const theme = useStore(s => s.settings.theme ?? 'system');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (dark: boolean) => root.setAttribute('data-theme', dark ? 'dark' : 'light');
      apply(mql.matches);
      mql.addEventListener('change', e => apply(e.matches));
      return () => mql.removeEventListener('change', e => apply(e.matches));
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return null;
}

// ── Folder-required gate ───────────────────────────────────────────────────────

function FolderGate({ onConnected }: { onConnected: () => void }) {
  const setAdapter = useStore(s => s.setAdapter);
  const init = useStore(s => s.init);
  const updateSettings = useStore(s => s.updateSettings);

  const [status, setStatus] = useState<'idle' | 'picking' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handlePick() {
    setStatus('picking');
    setError('');
    try {
      const dirHandle = await (window as Window & {
        showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker({ mode: 'readwrite' });

      await saveDirectoryHandle(dirHandle);
      const mdAdapter = new MarkdownFsAdapter(dirHandle);
      setAdapter(mdAdapter);
      await init();
      updateSettings({ markdownFolder: { folderName: dirHandle.name } });
      onConnected();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not open folder');
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '40px 48px',
        maxWidth: 420,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        textAlign: 'center',
      }}>
        {/* Logo */}
        <img src="/tasky.svg" alt="Tasky" style={{ width: 48, height: 48 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{
            fontSize: 'var(--font-size-xl)', fontWeight: 800,
            color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
          }}>
            Connect a folder to get started
          </h1>
          <p style={{
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)',
            lineHeight: 1.6, margin: 0,
          }}>
            Tasky stores your tickets as Markdown files in a folder you choose.
            Pick a folder to load your workspace — or select an empty folder to start fresh.
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 'var(--font-size-md)' }}
          onClick={handlePick}
          disabled={status === 'picking'}
        >
          {status === 'picking' ? 'Waiting for folder…' : 'Choose folder'}
        </button>

        {error && (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', margin: 0 }}>
            {error}
          </p>
        )}

        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', margin: 0 }}>
          Works in Chrome and Edge · Your data never leaves your device
        </p>
      </div>
    </div>
  );
}

// ── App shell ──────────────────────────────────────────────────────────────────

function AppShell() {
  const init = useStore(s => s.init);
  const isLoading = useStore(s => s.isLoading);
  const lastError = useStore(s => s.lastError);
  const adapter = useStore(s => s.adapter);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [folderConnected, setFolderConnected] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--color-text-subtle)',
        fontSize: 'var(--font-size-md)',
      }}>
        Loading…
      </div>
    );
  }

  if (lastError) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        color: 'var(--color-danger)', fontSize: 'var(--font-size-md)',
      }}>
        <strong>Failed to load data</strong>
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
          {lastError}
        </code>
      </div>
    );
  }

  // Show the folder gate if no markdown folder is connected and user hasn't
  // just connected one in this session.
  const isFolderLinked = adapter instanceof MarkdownFsAdapter || folderConnected;

  if (!isFolderLinked) {
    return <FolderGate onConnected={() => setFolderConnected(true)} />;
  }

  const mainPaddingLeft = sidebarPinned
    ? 'var(--sidebar-width-expanded)'
    : 'var(--sidebar-width-collapsed)';

  return (
    <>
      <Nav pinned={sidebarPinned} onToggle={() => setSidebarPinned(p => !p)} />
      <main
        style={{
          paddingLeft: mainPaddingLeft,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'padding-left 0.22s ease',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/backlog" element={<BacklogPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/releases" element={<ReleasesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeApplicator />
      <AppShell />
    </BrowserRouter>
  );
}

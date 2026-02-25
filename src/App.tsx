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

function AppShell() {
  const init = useStore(s => s.init);
  const isLoading = useStore(s => s.isLoading);
  const lastError = useStore(s => s.lastError);
  const [sidebarPinned, setSidebarPinned] = useState(true);

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
      <AppShell />
    </BrowserRouter>
  );
}

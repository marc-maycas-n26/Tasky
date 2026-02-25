import { useRef, useState } from 'react';
import { useStore } from '../../store';
import { ColorPickerPopover } from '../Common/ColorPickerPopover';
import './TagsPage.css';

export function TagsPage() {
  const tags = useStore(s => s.tags);
  const addTag = useStore(s => s.addTag);
  const updateTag = useStore(s => s.updateTag);
  const deleteTag = useStore(s => s.deleteTag);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#0052CC');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);

  function openAddRow() {
    setAdding(true);
    setNewName('');
    setNewColor('#0052CC');
    setTimeout(() => newInputRef.current?.focus(), 0);
  }

  function handleAdd() {
    if (!newName.trim()) { setAdding(false); return; }
    addTag(newName.trim(), newColor);
    setNewName('');
    setNewColor('#0052CC');
    setAdding(false);
  }

  function cancelAdd() {
    setAdding(false);
    setNewName('');
  }

  function startEdit(id: string) {
    const tag = tags.find(t => t.id === id)!;
    setEditId(id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    updateTag(editId, { name: editName.trim(), color: editColor });
    setEditId(null);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Tags</h1>
        <p className="page-subtitle">Create and manage reusable tags for your tickets.</p>
      </div>

      <div className="card">
        <div className="card-header columns-card-header">
          <span>All tags ({tags.length})</span>
          {!adding && (
            <button className="btn btn-primary btn-sm" onClick={openAddRow}>
              + Add tag
            </button>
          )}
        </div>

        {adding && (
          <div className="card-body columns-add-row">
            <input
              ref={newInputRef}
              className="form-input"
              placeholder="Tag name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') cancelAdd();
              }}
              style={{ flex: 1 }}
            />
            <ColorPickerPopover value={newColor} onChange={setNewColor} />
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
            <button className="btn btn-secondary btn-sm" onClick={cancelAdd}>Cancel</button>
          </div>
        )}

        {tags.length === 0 ? (
          <div className="card-empty">No tags yet. Click "+ Add tag" to create one.</div>
        ) : (
          <div className="tmpl-list">
            {tags.map(tag => (
              <div key={tag.id} className="tmpl-item">
                {editId === tag.id ? (
                  <>
                    <div className="tmpl-item-info">
                      <span
                        className="chip"
                        style={{ background: editColor + '22', color: editColor, border: `1px solid ${editColor}66` }}
                      >
                        {editName || 'preview'}
                      </span>
                      <input
                        className="form-input form-input-inline"
                        value={editName}
                        autoFocus
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
                      />
                      <ColorPickerPopover value={editColor} onChange={setEditColor} />
                    </div>
                    <div className="table-actions">
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="tmpl-item-info">
                      <span
                        className="chip"
                        style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}66` }}
                      >
                        {tag.name}
                      </span>
                      <span className="tmpl-item-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="color-dot" style={{ background: tag.color }} title={tag.color} />
                        {tag.color}
                      </span>
                    </div>
                    <div className="table-actions">
                      <button className="btn btn-icon btn-primary btn-sm" title="Edit" onClick={() => startEdit(tag.id)}>
                        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                      </button>
                      <button className="btn btn-icon btn-sm btn-icon-danger" title="Delete" onClick={() => deleteTag(tag.id)}>
                        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3 3.5l.5 8.5a.5.5 0 00.5.5h6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

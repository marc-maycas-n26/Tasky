import { useState } from 'react';
import { useStore } from '../../store';
import { ColorPickerPopover } from '../Common/ColorPickerPopover';
import './TagsPage.css';

export function TagsPage() {
  const tags = useStore(s => s.tags);
  const addTag = useStore(s => s.addTag);
  const updateTag = useStore(s => s.updateTag);
  const deleteTag = useStore(s => s.deleteTag);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#0052CC');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  function handleAdd() {
    if (!newName.trim()) return;
    addTag(newName.trim(), newColor);
    setNewName('');
    setNewColor('#0052CC');
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
        <div className="card-header">Add new tag</div>
        <div className="card-body">
          <div className="tags-add-row">
            <input
              className="form-input"
              placeholder="Tag name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              style={{ flex: 1 }}
            />
            <ColorPickerPopover value={newColor} onChange={setNewColor} />
            <button className="btn btn-primary" onClick={handleAdd}>Add tag</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">All tags ({tags.length})</div>
        {tags.length === 0 ? (
          <div className="card-empty">No tags yet. Add one above.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Name</th>
                <th>Color</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map(tag => (
                <tr key={tag.id}>
                  {editId === tag.id ? (
                    <>
                      <td>
                        <span className="chip" style={{ background: editColor + '22', color: editColor, border: `1px solid ${editColor}66` }}>
                          {editName || 'preview'}
                        </span>
                      </td>
                      <td>
                        <input
                          className="form-input form-input-inline"
                          value={editName}
                          autoFocus
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
                        />
                      </td>
                      <td><ColorPickerPopover value={editColor} onChange={setEditColor} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <span className="chip" style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}66` }}>
                          {tag.name}
                        </span>
                      </td>
                      <td>{tag.name}</td>
                      <td><span className="color-dot" style={{ background: tag.color }} title={tag.color} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => startEdit(tag.id)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteTag(tag.id)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

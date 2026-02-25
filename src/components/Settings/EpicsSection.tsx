import { useState } from 'react';
import { useStore } from '../../store';
import { ColorPicker } from '../Common/ColorPicker';
import { useDragReorder } from '../../hooks/useDragReorder';

export function EpicsSection() {
  const epics = useStore(s => s.epics);
  const addEpic = useStore(s => s.addEpic);
  const updateEpic = useStore(s => s.updateEpic);
  const deleteEpic = useStore(s => s.deleteEpic);
  const reorderEpics = useStore(s => s.reorderEpics);

  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#6554C0');
  const [newDesc, setNewDesc] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const sorted = [...epics].sort((a, b) => a.order - b.order);
  const { dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragLeave } =
    useDragReorder(sorted, reorderEpics);

  function handleAdd() {
    if (!newTitle.trim()) return;
    addEpic({ title: newTitle.trim(), color: newColor, description: newDesc.trim() || undefined });
    setNewTitle('');
    setNewColor('#6554C0');
    setNewDesc('');
  }

  function startEdit(id: string) {
    const epic = epics.find(e => e.id === id)!;
    setEditId(id);
    setEditTitle(epic.title);
    setEditColor(epic.color ?? '#6554C0');
    setEditDesc(epic.description ?? '');
  }

  function saveEdit() {
    if (!editId || !editTitle.trim()) return;
    updateEpic(editId, { title: editTitle.trim(), color: editColor, description: editDesc.trim() || undefined });
    setEditId(null);
  }

  return (
    <div className="card">
      <div className="card-header">Epics</div>
      <div className="card-body">
        <div className="settings-add-row settings-add-row--epics">
          <input
            className="form-input"
            placeholder="Epic title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            style={{ flex: 2 }}
          />
          <input
            className="form-input"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            style={{ flex: 3 }}
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </div>
      </div>

      {sorted.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th>Color</th>
              <th>Title</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(epic => (
              <tr
                key={epic.id}
                draggable
                onDragStart={() => handleDragStart(epic.id)}
                onDragOver={e => handleDragOver(e, epic.id)}
                onDrop={() => handleDrop(epic.id)}
                onDragLeave={handleDragLeave}
                className={dragOverId === epic.id ? 'row-drag-over' : ''}
              >
                {editId === epic.id ? (
                  <>
                    <td className="drag-handle">⠿</td>
                    <td><ColorPicker value={editColor} onChange={setEditColor} /></td>
                    <td>
                      <input
                        className="form-input form-input-inline"
                        value={editTitle}
                        autoFocus
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input form-input-inline"
                        value={editDesc}
                        placeholder="Optional"
                        onChange={e => setEditDesc(e.target.value)}
                      />
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="drag-handle">⠿</td>
                    <td><span className="color-dot" style={{ background: epic.color }} /></td>
                    <td>{epic.title}</td>
                    <td className="text-subtle">{epic.description ?? '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-icon btn-secondary btn-sm" title="Edit" onClick={() => startEdit(epic.id)}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                        </button>
                        <button className="btn btn-icon btn-sm btn-icon-danger" title="Delete" onClick={() => deleteEpic(epic.id)}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3 3.5l.5 8.5a.5.5 0 00.5.5h6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
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
  );
}

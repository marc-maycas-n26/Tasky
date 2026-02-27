import { useRef, useState } from 'react';
import { useStore } from '../../store';
import { useDragReorder } from '../../hooks/useDragReorder';
import { getColumnColor } from '../../utils/columnColor';
import { EditColumnRow } from './EditColumnRow';

export function ColumnsSection() {
  const columns = useStore(s => s.columns);
  const addColumn = useStore(s => s.addColumn);
  const updateColumn = useStore(s => s.updateColumn);
  const deleteColumn = useStore(s => s.deleteColumn);
  const reorderColumns = useStore(s => s.reorderColumns);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const { dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragLeave } =
    useDragReorder(sorted, reorderColumns);

  function openAddRow() {
    setAdding(true);
    setNewName('');
    setTimeout(() => newInputRef.current?.focus(), 0);
  }

  function handleAdd() {
    if (!newName.trim()) { setAdding(false); return; }
    addColumn(newName.trim());
    setNewName('');
    setAdding(false);
  }

  function cancelAdd() {
    setAdding(false);
    setNewName('');
  }

  function startEdit(id: string) {
    const col = columns.find(c => c.id === id)!;
    setEditId(id);
    setEditName(col.name);
    setEditColor(col.color ?? '');
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    updateColumn(editId, { name: editName.trim(), color: editColor || undefined });
    setEditId(null);
  }

  return (
    <div className="card">
      <div className="card-header columns-card-header">
        <span>Columns</span>
        {!adding && (
          <button className="btn btn-icon btn-primary btn-sm" onClick={openAddRow} title="Add column">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {adding && (
        <div className="card-body columns-add-row">
          <input
            ref={newInputRef}
            className="form-input"
            placeholder="Column name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') cancelAdd();
            }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
          <button className="btn btn-secondary btn-sm" onClick={cancelAdd}>Cancel</button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="col-list">

          {/* Header */}
          <div className="col-list-header">
            <span className="col-list-cell col-list-handle" />
            <span className="col-list-cell col-list-name">Name</span>
            <span className="col-list-cell col-list-color">Color</span>
            <span className="col-list-cell col-list-status">Status</span>
            <span className="col-list-cell col-list-actions">Actions</span>
          </div>

          {sorted.map(col => (
            <div
              key={col.id}
              className={`col-list-row${editId === col.id ? ' col-list-row--editing' : ''}${dragOverId === col.id ? ' col-list-row--drag-over' : ''}`}
              draggable
              onDragStart={() => handleDragStart(col.id)}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={() => handleDrop(col.id)}
              onDragLeave={handleDragLeave}
            >
              {editId === col.id ? (
                <EditColumnRow
                  col={col}
                  editName={editName}
                  onEditNameChange={setEditName}
                  editColor={editColor}
                  onEditColorChange={setEditColor}
                  onSave={saveEdit}
                  onCancel={() => setEditId(null)}
                  onRoleChange={role => updateColumn(col.id, { role, isTodo: role === 'todo' })}
                />
              ) : (
                <>
                  <span className="col-list-cell col-list-handle drag-handle">⠿</span>
                  <span className="col-list-cell col-list-name">{col.name}</span>
                  <span className="col-list-cell col-list-color">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: getColumnColor(col),
                        border: '1px solid rgba(0,0,0,0.1)',
                        flexShrink: 0,
                      }}
                      title={col.color ?? 'auto'}
                    />
                  </span>
                  <span className="col-list-cell col-list-status">
                    {col.role && (
                      <span className="flag-chip">
                        {col.role === 'todo' ? 'To Do' : col.role === 'in_progress' ? 'In Progress' : 'Done'}
                      </span>
                    )}
                  </span>
                  <span className="col-list-cell col-list-actions">
                    <button className="btn btn-icon btn-primary btn-sm" title="Edit" onClick={() => startEdit(col.id)}>
                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="btn btn-icon btn-sm btn-icon-danger" title="Delete" onClick={() => deleteColumn(col.id)}>
                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3 3.5l.5 8.5a.5.5 0 00.5.5h6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

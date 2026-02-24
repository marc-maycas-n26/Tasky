import { useState } from 'react';
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

  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editWip, setEditWip] = useState('');
  const [editColor, setEditColor] = useState('');

  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const { dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragLeave } =
    useDragReorder(sorted, reorderColumns);

  function handleAdd() {
    if (!newName.trim()) return;
    addColumn(newName.trim());
    setNewName('');
  }

  function startEdit(id: string) {
    const col = columns.find(c => c.id === id)!;
    setEditId(id);
    setEditName(col.name);
    setEditWip(col.wipLimit != null ? String(col.wipLimit) : '');
    setEditColor(col.color ?? '');
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    const wipNum = editWip === '' ? undefined : parseInt(editWip, 10);
    updateColumn(editId, {
      name: editName.trim(),
      wipLimit: isNaN(wipNum as number) ? undefined : wipNum,
      color: editColor || undefined,
    });
    setEditId(null);
  }

  return (
    <div className="card">
      <div className="card-header">Columns</div>
      <div className="card-body">
        <div className="settings-add-row">
          <input
            className="form-input"
            placeholder="New column name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="settings-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th>Name</th>
              <th>Color</th>
              <th>WIP limit</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(col => (
              <tr
                key={col.id}
                draggable
                onDragStart={() => handleDragStart(col.id)}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={() => handleDrop(col.id)}
                onDragLeave={handleDragLeave}
                className={dragOverId === col.id ? 'row-drag-over' : ''}
              >
                {editId === col.id ? (
                  <EditColumnRow
                    col={col}
                    editName={editName}
                    onEditNameChange={setEditName}
                    editWip={editWip}
                    onEditWipChange={setEditWip}
                    editColor={editColor}
                    onEditColorChange={setEditColor}
                    onSave={saveEdit}
                    onCancel={() => setEditId(null)}
                    onFlagChange={(flag, value) => updateColumn(col.id, { [flag]: value })}
                  />
                ) : (
                  <>
                    <td className="drag-handle">⠿</td>
                    <td>{col.name}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: getColumnColor(col),
                          verticalAlign: 'middle',
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                        title={col.color ? col.color : 'auto'}
                      />
                    </td>
                    <td>{col.wipLimit ?? <span className="text-subtle">—</span>}</td>
                    <td>
                      <div className="flags-row">
                        {col.isBacklog && <span className="flag-chip">Backlog</span>}
                        {col.isTodo && <span className="flag-chip">To-do</span>}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(col.id)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteColumn(col.id)}>Delete</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

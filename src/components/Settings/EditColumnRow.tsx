import { getColumnColor } from '../../utils/columnColor';
import type { Column } from '../../types';

interface Props {
  col: Column;
  editName: string;
  onEditNameChange: (v: string) => void;
  editWip: string;
  onEditWipChange: (v: string) => void;
  editColor: string;
  onEditColorChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onFlagChange: (flag: 'isBacklog' | 'isTodo', value: boolean) => void;
}

export function EditColumnRow({
  col,
  editName,
  onEditNameChange,
  editWip,
  onEditWipChange,
  editColor,
  onEditColorChange,
  onSave,
  onCancel,
  onFlagChange,
}: Props) {
  return (
    <>
      <td className="drag-handle">⠿</td>
      <td>
        <input
          className="form-input form-input-inline"
          value={editName}
          autoFocus
          onChange={e => onEditNameChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
        />
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="color"
            value={editColor || getColumnColor(col)}
            onChange={e => onEditColorChange(e.target.value)}
            style={{ width: 32, height: 28, border: 'none', borderRadius: 4, padding: 2, cursor: 'pointer' }}
          />
          {editColor && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onEditColorChange('')}
              title="Reset to default"
            >
              Reset
            </button>
          )}
        </div>
      </td>
      <td>
        <input
          className="form-input form-input-inline"
          type="number"
          min={1}
          placeholder="None"
          value={editWip}
          onChange={e => onEditWipChange(e.target.value)}
          style={{ width: 80 }}
        />
      </td>
      <td>
        <div className="flags-row">
          <label className="flag-label">
            <input
              type="checkbox"
              checked={col.isBacklog}
              onChange={e => onFlagChange('isBacklog', e.target.checked)}
            />
            Backlog
          </label>
          <label className="flag-label">
            <input
              type="checkbox"
              checked={col.isTodo}
              onChange={e => onFlagChange('isTodo', e.target.checked)}
            />
            To-do
          </label>
        </div>
      </td>
      <td>
        <div className="table-actions">
          <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </td>
    </>
  );
}

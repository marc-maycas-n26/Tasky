import { getColumnColor } from '../../utils/columnColor';
import { ColorPickerPopover } from '../Common/ColorPickerPopover';
import type { Column, ColumnRole } from '../../types';

interface Props {
  col: Column;
  editName: string;
  onEditNameChange: (v: string) => void;
  editColor: string;
  onEditColorChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRoleChange: (role: ColumnRole | undefined) => void;
}

export function EditColumnRow({
  col,
  editName,
  onEditNameChange,
  editColor,
  onEditColorChange,
  onSave,
  onCancel,
  onRoleChange,
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
        <ColorPickerPopover
          value={editColor || getColumnColor(col)}
          onChange={onEditColorChange}
          size={16}
        />
      </td>
      <td>
        <select
          className="form-input form-input-inline"
          value={col.role ?? ''}
          onChange={e => onRoleChange((e.target.value as ColumnRole) || undefined)}
        >
          <option value="">None</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
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

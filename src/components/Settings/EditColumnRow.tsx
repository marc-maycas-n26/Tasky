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
          style={{ width: '100%', boxSizing: 'border-box' }}
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
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={col.role ?? ''}
          onChange={e => onRoleChange((e.target.value as ColumnRole) || undefined)}
        >
          <option value="">None</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-icon btn-primary btn-sm" title="Save" onClick={onSave}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="5" y="2" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="4" y="8" width="8" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
          </button>
          <button className="btn btn-icon btn-sm btn-secondary" title="Cancel" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </td>
    </>
  );
}

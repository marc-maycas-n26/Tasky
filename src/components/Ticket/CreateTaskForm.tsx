import { PRIORITIES } from '../../constants/priorities';
import { RichTextEditor } from './RichTextEditor';
import type { Column, Epic, Tag, Template, Priority } from '../../types';

interface Props {
  columns: Column[];
  epics: Epic[];
  tags: Tag[];
  templates: Template[];
  columnId: string;
  onColumnChange: (id: string) => void;
  epicId: string;
  onEpicChange: (id: string) => void;
  priority: Priority | '';
  onPriorityChange: (p: Priority | '') => void;
  tagIds: string[];
  onTagToggle: (id: string) => void;
  description: string;
  onDescriptionChange: (html: string) => void;
  selectedTemplate: string;
  onTemplateChange: (id: string) => void;
  hideColumnPicker?: boolean;
}

export function CreateTaskForm({
  columns,
  epics,
  tags,
  templates,
  columnId,
  onColumnChange,
  epicId,
  onEpicChange,
  priority,
  onPriorityChange,
  tagIds,
  onTagToggle,
  description,
  onDescriptionChange,
  selectedTemplate,
  onTemplateChange,
  hideColumnPicker,
}: Props) {
  const sortedCols = [...columns].sort((a, b) => a.order - b.order);

  return (
    <>
      {templates.length > 0 && (
        <div className="form-field">
          <label className="form-label">Template (optional)</label>
          <select
            className="form-input"
            value={selectedTemplate}
            onChange={e => onTemplateChange(e.target.value)}
          >
            <option value="">— Blank —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="create-ticket-row">
        {!hideColumnPicker && (
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Column *</label>
            <select className="form-input" value={columnId} onChange={e => onColumnChange(e.target.value)}>
              {sortedCols.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-field" style={{ flex: 1 }}>
          <label className="form-label">Epic</label>
          <select className="form-input" value={epicId} onChange={e => onEpicChange(e.target.value)}>
            <option value="">— None —</option>
            {epics.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Priority</label>
        <select className="form-input" value={priority} onChange={e => onPriorityChange(e.target.value as Priority | '')}>
          <option value="">— None —</option>
          {PRIORITIES.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {tags.length > 0 && (
        <div className="form-field">
          <label className="form-label">Tags</label>
          <div className="create-ticket-tags">
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                className={`chip tag-toggle${tagIds.includes(tag.id) ? ' tag-toggle--active' : ''}`}
                style={{
                  background: tagIds.includes(tag.id) ? tag.color + '22' : 'transparent',
                  color: tag.color,
                  border: `1px solid ${tag.color}66`,
                }}
                onClick={() => onTagToggle(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-field">
        <label className="form-label">Description</label>
        <RichTextEditor
          key="task-desc"
          value={description}
          onChange={onDescriptionChange}
          placeholder="Add a description…"
        />
      </div>
    </>
  );
}

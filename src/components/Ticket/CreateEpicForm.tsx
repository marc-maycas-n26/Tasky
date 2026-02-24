import { ColorPicker } from '../Common/ColorPicker';
import { RichTextEditor } from './RichTextEditor';
import type { Tag } from '../../types';

interface Props {
  color: string;
  onColorChange: (color: string) => void;
  description: string;
  onDescriptionChange: (html: string) => void;
  tags: Tag[];
  tagIds: string[];
  onTagToggle: (id: string) => void;
}

export function CreateEpicForm({
  color,
  onColorChange,
  description,
  onDescriptionChange,
  tags,
  tagIds,
  onTagToggle,
}: Props) {
  return (
    <>
      <div className="form-field">
        <label className="form-label">Color</label>
        <ColorPicker value={color} onChange={onColorChange} />
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
          key="epic-desc"
          value={description}
          onChange={onDescriptionChange}
          placeholder="Optional description…"
        />
      </div>
    </>
  );
}

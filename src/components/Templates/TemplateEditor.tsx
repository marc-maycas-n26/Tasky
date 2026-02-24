import { useState } from 'react';
import type { Template, Priority } from '../../types';
import { PRIORITIES } from '../../constants/priorities';
import { RichTextEditor } from '../Ticket/RichTextEditor';

type EditingTemplate = Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

interface Props {
  editing: EditingTemplate;
  tags: import('../../types').Tag[];
  onSave: () => void;
  onCancel: () => void;
  onChange: (updated: EditingTemplate) => void;
}

export function TemplateEditor({ editing, tags, onSave, onCancel, onChange }: Props) {
  const [newSubTitle, setNewSubTitle] = useState('');

  function patchField<K extends keyof Template['defaultFields']>(key: K, value: Template['defaultFields'][K]) {
    onChange({ ...editing, defaultFields: { ...editing.defaultFields, [key]: value } });
  }

  function addSub() {
    if (!newSubTitle.trim()) return;
    onChange({ ...editing, defaultSubtasks: [...editing.defaultSubtasks, { title: newSubTitle.trim() }] });
    setNewSubTitle('');
  }

  function removeSub(i: number) {
    onChange({ ...editing, defaultSubtasks: editing.defaultSubtasks.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="card">
      <div className="card-header">{editing.id ? 'Edit template' : 'New template'}</div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-field">
          <label className="form-label">Template name *</label>
          <input
            className="form-input"
            placeholder="e.g. Bug Report"
            value={editing.name}
            autoFocus
            onChange={e => onChange({ ...editing, name: e.target.value })}
          />
        </div>

        <div className="tmpl-row">
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Default title prefix</label>
            <input
              className="form-input"
              placeholder="e.g. [Bug] "
              value={editing.defaultFields.title ?? ''}
              onChange={e => patchField('title', e.target.value || undefined)}
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Default priority</label>
            <select
              className="form-input"
              value={editing.defaultFields.priority ?? ''}
              onChange={e => patchField('priority', (e.target.value as Priority) || undefined)}
            >
              <option value="">— None —</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="form-field">
            <label className="form-label">Default tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tag => {
                const active = editing.defaultFields.tagIds?.includes(tag.id) ?? false;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className="chip"
                    style={{
                      background: active ? tag.color + '22' : 'transparent',
                      color: tag.color,
                      border: `1px solid ${tag.color}66`,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const cur = editing.defaultFields.tagIds ?? [];
                      patchField('tagIds', active ? cur.filter(id => id !== tag.id) : [...cur, tag.id]);
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="form-field">
          <label className="form-label">Default description</label>
          <RichTextEditor
            key={editing.id ?? 'new'}
            value={editing.defaultFields.description ?? ''}
            onChange={html => patchField('description', html || undefined)}
            placeholder="Default description…"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Default subtasks</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {editing.defaultSubtasks.map((st, i) => (
              <div key={i} className="subtask-row">
                <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{st.title}</span>
                <button className="btn btn-icon btn-ghost btn-sm" onClick={() => removeSub(i)}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Add default subtask…"
                value={newSubTitle}
                onChange={e => setNewSubTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSub(); }}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary btn-sm" onClick={addSub}>Add</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave}>Save template</button>
        </div>
      </div>
    </div>
  );
}

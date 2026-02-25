import { useState } from 'react';
import { useStore } from '../../store';
import type { Template } from '../../types';
import { TemplateEditor } from './TemplateEditor';
import './TemplatesPage.css';

type EditingTemplate = Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

const EMPTY_TMPL = (): EditingTemplate => ({
  name: '',
  defaultFields: {},
  defaultSubtasks: [],
});

export function TemplatesPage() {
  const templates = useStore(s => s.templates);
  const tags = useStore(s => s.tags);
  const addTemplate = useStore(s => s.addTemplate);
  const updateTemplate = useStore(s => s.updateTemplate);
  const deleteTemplate = useStore(s => s.deleteTemplate);

  const [editing, setEditing] = useState<EditingTemplate | null>(null);

  function openEdit(t: Template) {
    setEditing({ id: t.id, name: t.name, defaultFields: { ...t.defaultFields }, defaultSubtasks: [...t.defaultSubtasks] });
  }

  function save() {
    if (!editing || !editing.name.trim()) return;
    if (editing.id) {
      updateTemplate(editing.id, { name: editing.name, defaultFields: editing.defaultFields, defaultSubtasks: editing.defaultSubtasks });
    } else {
      addTemplate({ name: editing.name, defaultFields: editing.defaultFields, defaultSubtasks: editing.defaultSubtasks });
    }
    setEditing(null);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Templates</h1>
            <p className="page-subtitle">Pre-configured ticket blueprints for faster creation.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing(EMPTY_TMPL())}>+ New template</button>
        </div>
      </div>

      {editing && (
        <TemplateEditor
          editing={editing}
          tags={tags}
          onSave={save}
          onCancel={() => setEditing(null)}
          onChange={setEditing}
        />
      )}

      <div className="card">
        <div className="card-header">All templates ({templates.length})</div>
        {templates.length === 0 ? (
          <div className="card-empty">No templates yet. Create one above.</div>
        ) : (
          <div className="tmpl-list">
            {templates.map(t => (
              <div key={t.id} className="tmpl-item">
                <div className="tmpl-item-info">
                  <span className="tmpl-item-name">{t.name}</span>
                  <span className="tmpl-item-meta">
                    {t.defaultSubtasks.length} default subtask{t.defaultSubtasks.length !== 1 ? 's' : ''}
                    {t.defaultFields.priority ? ` · ${t.defaultFields.priority} priority` : ''}
                  </span>
                </div>
                <div className="table-actions">
                  <button className="btn btn-icon btn-primary btn-sm" title="Edit" onClick={() => openEdit(t)}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  </button>
                  <button className="btn btn-icon btn-sm btn-icon-danger" title="Delete" onClick={() => deleteTemplate(t.id)}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3 3.5l.5 8.5a.5.5 0 00.5.5h6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

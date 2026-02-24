import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import type { Priority } from '../../types';
import { CreateEpicForm } from './CreateEpicForm';
import { CreateTaskForm } from './CreateTaskForm';
import './CreateTicketModal.css';

type IssueType = 'task' | 'epic';

export function CreateTicketModal() {
  const closeCreateTicket = useStore(s => s.closeCreateTicket);
  const createTicketDefaults = useStore(s => s.createTicketDefaults);
  const addTicket = useStore(s => s.addTicket);
  const addEpic = useStore(s => s.addEpic);
  const openTicket = useStore(s => s.openTicket);
  const columns = useStore(s => s.columns);
  const epics = useStore(s => s.epics);
  const tags = useStore(s => s.tags);
  const templates = useStore(s => s.templates);

  const sortedCols = [...columns].sort((a, b) => a.order - b.order);
  const backlogCol = columns.find(c => c.isBacklog) ?? sortedCols[0];
  const todoCol = columns.find(c => c.isTodo) ?? sortedCols.find(c => !c.isBacklog) ?? sortedCols[0];

  const [issueType, setIssueType] = useState<IssueType>('task');
  const [title, setTitle] = useState(createTicketDefaults.title ?? '');
  const [description, setDescription] = useState(createTicketDefaults.description ?? '');
  const [columnId, setColumnId] = useState(createTicketDefaults.columnId ?? backlogCol?.id ?? '');
  const [epicId, setEpicId] = useState(createTicketDefaults.epicId ?? '');
  const [priority, setPriority] = useState<Priority | ''>(createTicketDefaults.priority ?? '');
  const [tagIds, setTagIds] = useState<string[]>(createTicketDefaults.tagIds ?? []);
  const [epicTagIds, setEpicTagIds] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [epicColor, setEpicColor] = useState('#6554C0');
  const [error, setError] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCreateTicket(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  function handleTypeChange(type: IssueType) {
    setIssueType(type);
    setError('');
    if (type === 'task') {
      setColumnId(createTicketDefaults.columnId ?? backlogCol?.id ?? '');
    }
  }

  function applyTemplate(tmplId: string) {
    setSelectedTemplate(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;
    if (tmpl.defaultFields.title) setTitle(tmpl.defaultFields.title);
    if (tmpl.defaultFields.description) setDescription(tmpl.defaultFields.description);
    if (tmpl.defaultFields.priority) setPriority(tmpl.defaultFields.priority);
    if (tmpl.defaultFields.tagIds) setTagIds(tmpl.defaultFields.tagIds);
  }

  function toggleTag(id: string) {
    setTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function toggleEpicTag(id: string) {
    setEpicTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function handleCreate(andOpen = false) {
    if (!title.trim()) { setError('Title is required'); return; }

    if (issueType === 'epic') {
      addEpic({ title: title.trim(), description: description.trim() || undefined, color: epicColor, tagIds: epicTagIds });
      closeCreateTicket();
      return;
    }

    if (!columnId) { setError('Column is required'); return; }

    const ticket = addTicket({
      title: title.trim(),
      description,
      columnId,
      epicId: epicId || undefined,
      tagIds,
      priority: priority || undefined,
    });

    const tmpl = templates.find(t => t.id === selectedTemplate);
    if (tmpl) {
      tmpl.defaultSubtasks.forEach(st => {
        addTicket({
          title: st.title,
          columnId: todoCol?.id ?? columnId,
          epicId: epicId || undefined,
          parentId: ticket.id,
          tagIds: st.tags ?? [],
        });
      });
    }

    closeCreateTicket();
    if (andOpen) openTicket(ticket.id);
  }

  return (
    <>
      <div className="overlay" onClick={closeCreateTicket} />
      <div className="modal" role="dialog" aria-label="Create issue">
        <div className="modal-header">
          <span className="modal-title">Create Issue</span>
          <button className="btn btn-icon btn-ghost" onClick={closeCreateTicket}>✕</button>
        </div>

        <div className="modal-body">
          {/* Issue type selector — Epic first */}
          <div className="form-field">
            <label className="form-label">Issue type</label>
            <div className="issue-type-toggle">
              <button
                type="button"
                className={`issue-type-btn${issueType === 'epic' ? ' issue-type-btn--active' : ''}`}
                onClick={() => handleTypeChange('epic')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2.5 1.5h9a1 1 0 011 1v10l-5.5-2.75L1.5 12.5v-10a1 1 0 011-1z" fill={issueType === 'epic' ? epicColor : '#9CA3AF'} />
                </svg>
                Epic
              </button>
              <button
                type="button"
                className={`issue-type-btn${issueType === 'task' ? ' issue-type-btn--active' : ''}`}
                onClick={() => handleTypeChange('task')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  <path d="M5 5h4M5 7h4M5 9h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                Task
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="form-field">
            <label className="form-label">Title *</label>
            <input
              ref={titleRef}
              className="form-input"
              placeholder={issueType === 'epic' ? 'Epic title' : 'Issue title'}
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleCreate(); }}
            />
            {error && <span className="form-error">{error}</span>}
          </div>

          {issueType === 'epic' && (
            <CreateEpicForm
              color={epicColor}
              onColorChange={setEpicColor}
              description={description}
              onDescriptionChange={setDescription}
              tags={tags}
              tagIds={epicTagIds}
              onTagToggle={toggleEpicTag}
            />
          )}

          {issueType === 'task' && (
            <CreateTaskForm
              columns={columns}
              epics={epics}
              tags={tags}
              templates={templates}
              columnId={columnId}
              onColumnChange={setColumnId}
              epicId={epicId}
              onEpicChange={setEpicId}
              priority={priority}
              onPriorityChange={setPriority}
              tagIds={tagIds}
              onTagToggle={toggleTag}
              description={description}
              onDescriptionChange={setDescription}
              selectedTemplate={selectedTemplate}
              onTemplateChange={applyTemplate}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeCreateTicket}>Cancel</button>
          {issueType === 'task' && (
            <button className="btn btn-secondary" onClick={() => handleCreate(true)}>Create &amp; Open</button>
          )}
          <button className="btn btn-primary" onClick={() => handleCreate(false)}>
            {issueType === 'epic' ? 'Create epic' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}

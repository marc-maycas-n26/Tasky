import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import type { Epic, EpicStatus, Ticket } from '../../types';

type Columns = ReturnType<typeof useStore.getState>['columns'];
type Tags = ReturnType<typeof useStore.getState>['tags'];

function getEpicStatus(tickets: Ticket[], columns: Columns): 'todo' | 'inprogress' | 'done' {
  if (tickets.length === 0) return 'todo';
  const doneColIds = columns.filter(c => c.name.toLowerCase() === 'done').map(c => c.id);
  const todoColIds = columns.filter(c => c.isBacklog || c.isTodo).map(c => c.id);
  const allDone = tickets.every(t => doneColIds.includes(t.columnId));
  if (allDone) return 'done';
  const allTodo = tickets.every(t => todoColIds.includes(t.columnId));
  if (allTodo) return 'todo';
  return 'inprogress';
}

const EPIC_STATUS_LABELS = { todo: 'TO DO', inprogress: 'IN PROGRESS', done: 'DONE' };

interface Props {
  epic: Epic | null;
  tickets: Ticket[];
  columns: Columns;
  tags: Tags;
}

const EPIC_STATUS_OPTIONS: { value: EpicStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function SwimlaneEpicHeader({ epic, tickets, columns, tags: allTags }: Props) {
  const toggleEpicCollapsed = useStore(s => s.toggleEpicCollapsed);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const openEpic = useStore(s => s.openEpic);
  const updateEpic = useStore(s => s.updateEpic);

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusMenuOpen]);

  const backlogCol = columns.find(c => c.isBacklog) ?? columns[0];
  const isCollapsed = epic?.isCollapsed ?? false;
  const computedStatus = getEpicStatus(tickets, columns);
  const status = epic?.status ?? computedStatus;
  const statusLabel = EPIC_STATUS_LABELS[status];

  const groupTagIds = [...new Set(tickets.flatMap(t => t.tagIds))];
  const groupTags = allTags.filter(t => groupTagIds.includes(t.id));

  return (
    <div
      className="swimlane-epic-header"
      onClick={() => epic && toggleEpicCollapsed(epic.id)}
    >
      <span className="swimlane-toggle-btn" aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
        {isCollapsed ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 2l4 3-4 3V2z" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3l3 4 3-4H2z" fill="currentColor"/>
          </svg>
        )}
      </span>

      <span className="swimlane-epic-icon" style={{ color: epic?.color ?? '#8993A4' }}>
        {epic ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 1.5h9a1 1 0 011 1v10l-5.5-2.75L1.5 12.5v-10a1 1 0 011-1z" fill={epic.color ?? '#FFAB00'} />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="#8993A4" opacity="0.4" />
          </svg>
        )}
      </span>

      <span
        className={`swimlane-epic-title${epic ? ' swimlane-epic-title--clickable' : ''}`}
        onClick={e => {
          if (epic) {
            e.stopPropagation();
            openEpic(epic.id);
          }
        }}
        title={epic ? 'Open epic details' : undefined}
      >
        {epic?.title ?? 'Other tasks'}
      </span>

      <span className="swimlane-epic-subtasks">
        ({tickets.length} {tickets.length === 1 ? 'issue' : 'issues'})
      </span>

      {groupTags.slice(0, 3).map(tag => (
        <span
          key={tag.id}
          className="swimlane-tag-chip"
          style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}55` }}
          onClick={e => e.stopPropagation()}
        >
          {tag.name}
        </span>
      ))}

      {epic && (
        <div
          className="swimlane-epic-status-wrapper"
          ref={statusRef}
          onClick={e => e.stopPropagation()}
        >
          <button
            className={`swimlane-epic-status swimlane-epic-status--${status} swimlane-epic-status--btn`}
            onClick={() => setStatusMenuOpen(v => !v)}
            title="Change epic status"
            aria-haspopup="listbox"
            aria-expanded={statusMenuOpen}
          >
            {statusLabel}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true" style={{ marginLeft: 4, opacity: 0.7 }}>
              <path d="M1.5 2.5l2.5 3 2.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {statusMenuOpen && (
            <div className="swimlane-status-menu" role="listbox">
              <button
                className="swimlane-status-menu-item swimlane-status-menu-item--auto"
                role="option"
                aria-selected={epic.status == null}
                onClick={() => { updateEpic(epic.id, { status: undefined }); setStatusMenuOpen(false); }}
              >
                Auto
                {epic.status == null && <svg className="swimlane-status-check" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              {EPIC_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`swimlane-status-menu-item swimlane-status-menu-item--${opt.value}`}
                  role="option"
                  aria-selected={epic.status === opt.value}
                  onClick={() => { updateEpic(epic.id, { status: opt.value }); setStatusMenuOpen(false); }}
                >
                  {opt.label}
                  {epic.status === opt.value && <svg className="swimlane-status-check" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        className="swimlane-add-btn"
        title="Create issue in this epic"
        onClick={e => {
          e.stopPropagation();
          openCreateTicket({ epicId: epic?.id, columnId: backlogCol?.id });
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Create
      </button>
    </div>
  );
}

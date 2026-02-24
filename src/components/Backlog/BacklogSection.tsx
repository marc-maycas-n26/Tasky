import { useStore } from '../../store';
import { EpicGroup } from './EpicGroup';
import type { Ticket } from '../../types';

interface Props {
  allBacklogTickets: Ticket[];
  search: string;
}

export function BacklogSection({ allBacklogTickets, search }: Props) {
  const epics = useStore(s => s.epics);
  const columns = useStore(s => s.columns);
  const openCreateTicket = useStore(s => s.openCreateTicket);
  const backlogCol = columns.find(c => c.isBacklog);

  const sortedEpics = [...epics].sort((a, b) => a.order - b.order);

  const epicGroups = sortedEpics.map(epic => ({
    epic,
    tickets: allBacklogTickets.filter(t => t.epicId === epic.id),
  })).filter(g => g.tickets.length > 0 || !search);

  const noEpicTickets = allBacklogTickets.filter(t => !t.epicId);
  const total = allBacklogTickets.length;

  return (
    <div className="bl-section">
      <div className="bl-section-header bl-section-header--backlog">
        <span className="bl-section-title">Backlog</span>
        <span className="bl-section-count">{total}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={e => { e.stopPropagation(); openCreateTicket({ columnId: backlogCol?.id }); }}
          >
            + Add issue
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="bl-empty">No backlog items. Click "+ Add issue" to create one.</div>
      ) : (
        <div className="bl-epic-groups">
          {epicGroups.map(({ epic, tickets }) => (
            <EpicGroup key={epic.id} epic={epic} tickets={tickets} search={search} />
          ))}
          {(epics.length === 0 || noEpicTickets.length > 0 || (!search && epics.length > 0)) && (
            <EpicGroup key="__no_epic__" epic={null} tickets={noEpicTickets} search={search} />
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '../../store';
import { CreateTicketModal } from '../Ticket/CreateTicketModal';
import { TicketDrawer } from '../Ticket/TicketDrawer';
import { EpicDrawer } from '../Epic/EpicDrawer';
import { BoardSection } from './BoardSection';
import { BacklogSection } from './BacklogSection';
import './BacklogPage.css';

export function BacklogPage() {
  const tickets = useStore(s => s.tickets);
  const columns = useStore(s => s.columns);
  const epics = useStore(s => s.epics);
  const isCreateTicketOpen = useStore(s => s.isCreateTicketOpen);
  const isTicketDrawerOpen = useStore(s => s.isTicketDrawerOpen);
  const isEpicDrawerOpen = useStore(s => s.isEpicDrawerOpen);
  const openEpic = useStore(s => s.openEpic);
  const openCreateTicket = useStore(s => s.openCreateTicket);

  const [search, setSearch] = useState('');

  const backlogCol = columns.find(c => c.isBacklog);

  const backlogTickets = tickets
    .filter(t => t.columnId === backlogCol?.id && !t.parentId)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bl-page">
      {/* Toolbar */}
      <div className="bl-toolbar">
        <div className="bl-toolbar-search">
          <span className="board-search-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            className="board-search-input"
            placeholder="Search issues"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="board-toolbar-sep" />

        {epics.length > 0 && (
          <div className="bl-epics-strip">
            {epics.map(ep => {
              const epTickets = tickets.filter(t => t.epicId === ep.id && !t.parentId);
              const doneColIds = columns.filter(c => c.name.toLowerCase() === 'done').map(c => c.id);
              const doneCount = epTickets.filter(t => doneColIds.includes(t.columnId)).length;
              const pct = epTickets.length > 0 ? Math.round((doneCount / epTickets.length) * 100) : 0;
              return (
                <button
                  key={ep.id}
                  className="bl-epic-btn"
                  style={{ borderColor: ep.color + '55' }}
                  onClick={() => openEpic(ep.id)}
                  title={`${epTickets.length} issues · ${pct}% done`}
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M1.5 1h7a.5.5 0 01.5.5v7.5L5 7.25 1 9V1.5a.5.5 0 01.5-.5z" fill={ep.color}/>
                  </svg>
                  <span style={{ color: ep.color, fontWeight: 600 }}>{ep.title}</span>
                  <span className="bl-epic-btn-count">{epTickets.length}</span>
                  {epTickets.length > 0 && (
                    <span className="bl-epic-btn-bar">
                      <span style={{ width: `${pct}%`, background: ep.color }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Clear</button>
        )}

        <div className="board-toolbar-right">
          <button className="btn btn-primary" onClick={() => openCreateTicket({ columnId: backlogCol?.id })}>
            + Create issue
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bl-content">
        <BoardSection />
        <BacklogSection allBacklogTickets={backlogTickets} search={search} />
      </div>

      {isTicketDrawerOpen && <TicketDrawer />}
      {isEpicDrawerOpen && <EpicDrawer />}
      {isCreateTicketOpen && <CreateTicketModal />}
    </div>
  );
}

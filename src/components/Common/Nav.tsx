import { NavLink } from 'react-router-dom';
import { useStore } from '../../store';
import './Nav.css';

const STATIC_NAV_ITEMS = [
  {
    to: '/',
    end: true,
    label: 'Board',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    to: '/backlog',
    end: false,
    label: 'Backlog',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M3 4.5h12M3 9h12M3 13.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/tags',
    end: false,
    label: 'Tags',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2 2h6.5l7.5 7.5-6.5 6.5L2 8.5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="6" cy="6" r="1.2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/templates',
    end: false,
    label: 'Templates',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 7h14M7 7v9" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    to: '/releases',
    end: false,
    label: 'Releases',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 9l2.5 2.5L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: '/settings',
    end: false,
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

interface Props {
  pinned: boolean;
  onToggle: () => void;
}

export function Nav({ pinned, onToggle }: Props) {
  const isSaving = useStore(s => s.isSaving);
  const trashedTickets = useStore(s => s.trashedTickets);
  const trashCount = trashedTickets.filter(tr => !tr.ticket.parentId).length;

  return (
    <nav className={`sidebar${pinned ? ' sidebar--pinned' : ' sidebar--collapsed'}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#4F46E5"/>
            <rect x="7" y="7" width="7" height="18" rx="2" fill="white" opacity="0.95"/>
            <rect x="18" y="7" width="7" height="11" rx="2" fill="white" opacity="0.95"/>
            <rect x="18" y="21" width="7" height="4" rx="2" fill="white" opacity="0.95"/>
          </svg>
        </span>
        <span className="sidebar-brand-name">Tasky</span>
      </div>

      {/* Nav links — labels always in DOM, hidden via CSS in collapsed state */}
      <div className="sidebar-links">
        {STATIC_NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}

        <NavLink
          to="/trash"
          end={false}
          className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
        >
          <span className="sidebar-link-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2.5 4.5h13M7 4.5V3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1.5M4.5 4.5l1 11a.5.5 0 00.5.5h7a.5.5 0 00.5-.5l1-11M7.5 7.5l.5 5M10.5 7.5l-.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="sidebar-link-label">Trash</span>
          {trashCount > 0 && (
            <span className="sidebar-trash-badge">{trashCount}</span>
          )}
        </NavLink>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title={pinned ? 'Collapse sidebar' : 'Pin sidebar open'}
          aria-label={pinned ? 'Collapse sidebar' : 'Pin sidebar open'}
        >
          {pinned ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <span className="sidebar-saving-slot">
          {isSaving && <span className="sidebar-saving">Saving…</span>}
        </span>
      </div>
    </nav>
  );
}

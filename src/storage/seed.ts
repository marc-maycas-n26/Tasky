import { v4 as uuidv4 } from 'uuid';
import type { AppState } from '../types';

const now = new Date().toISOString();

// ── Columns ───────────────────────────────────────────────────────────────────
const colDiscovery      = uuidv4();
const colExperimentation = uuidv4();
const colDevelopment    = uuidv4();
const colBlocked        = uuidv4();
const colDone           = uuidv4();

// ── Epics ─────────────────────────────────────────────────────────────────────
const epicDesign = uuidv4();
const epicAuth   = uuidv4();

// ── Tags ──────────────────────────────────────────────────────────────────────
const tagFrontend = uuidv4();
const tagBackend  = uuidv4();
const tagDesign   = uuidv4();
const tagBug      = uuidv4();
const tagSecurity = uuidv4();

// ── Template ──────────────────────────────────────────────────────────────────
const tmplBug = uuidv4();

// ── Tickets ───────────────────────────────────────────────────────────────────
const tDS1 = uuidv4();
const tDS2 = uuidv4();
const tDS3 = uuidv4();
const tDS4 = uuidv4();
const tDS5 = uuidv4();
const tDS6 = uuidv4();
const tDS7 = uuidv4();
const tDS8 = uuidv4();
const tDS9 = uuidv4();

const tAU1 = uuidv4();
const tAU2 = uuidv4();
const tAU3 = uuidv4();
const tAU4 = uuidv4();
const tAU5 = uuidv4();
const tAU6 = uuidv4();
const tAU7 = uuidv4();
const tAU8 = uuidv4();
const tAU9 = uuidv4();

export const SEED_DATA: AppState = {
  schemaVersion: 1,
  nextTicketNumber: 19,
  settings: { projectKey: 'TM' },

  columns: [
    { id: colDiscovery,       name: 'Discovery',       order: 0, isBacklog: false, isTodo: true,  createdAt: now, updatedAt: now },
    { id: colExperimentation, name: 'Experimentation', order: 1, isBacklog: false, isTodo: false, createdAt: now, updatedAt: now },
    { id: colDevelopment,     name: 'Development',     order: 2, isBacklog: false, isTodo: false, createdAt: now, updatedAt: now },
    { id: colBlocked,         name: 'Blocked',         order: 3, isBacklog: false, isTodo: false, createdAt: now, updatedAt: now },
    { id: colDone,            name: 'Done',            order: 4, isBacklog: false, isTodo: false, createdAt: now, updatedAt: now },
  ],

  epics: [
    {
      id: epicDesign,
      title: 'Design System',
      description: 'Establish the visual language, component library and spacing scale used across the whole product.',
      color: '#6554C0',
      tagIds: [tagDesign, tagFrontend],
      order: 0,
      isCollapsed: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: epicAuth,
      title: 'Authentication',
      description: 'Implement sign-up, login, password reset and session management end-to-end.',
      color: '#0052CC',
      tagIds: [tagBackend, tagSecurity],
      order: 1,
      isCollapsed: false,
      createdAt: now,
      updatedAt: now,
    },
  ],

  tags: [
    { id: tagFrontend, name: 'frontend', color: '#0052CC', createdAt: now, updatedAt: now },
    { id: tagBackend,  name: 'backend',  color: '#00875A', createdAt: now, updatedAt: now },
    { id: tagDesign,   name: 'design',   color: '#6554C0', createdAt: now, updatedAt: now },
    { id: tagBug,      name: 'bug',      color: '#DE350B', createdAt: now, updatedAt: now },
    { id: tagSecurity, name: 'security', color: '#FF5630', createdAt: now, updatedAt: now },
  ],

  templates: [
    {
      id: tmplBug,
      name: 'Bug Report',
      defaultFields: {
        title: '[Bug] ',
        description: '**Steps to reproduce:**\n1. \n2. \n\n**Expected:**\n\n**Actual:**\n',
        priority: 'high',
        tagIds: [tagBug],
      },
      defaultSubtasks: [
        { title: 'Reproduce the bug', tags: [] },
        { title: 'Write the fix', tags: [] },
        { title: 'Add regression test', tags: [] },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ],

  tickets: [
    // ── Design System ─────────────────────────────────────────────────────────

    // Done (3)
    { id: tDS1, key: 'TM-1', title: 'Define color palette and semantic tokens', description: 'Agree on primary, neutral and semantic color roles. Export as CSS custom properties.',                               columnId: colDone,            inBacklog: false, epicId: epicDesign, tagIds: [tagDesign],              order: 0, priority: 'high',    createdAt: now, updatedAt: now },
    { id: tDS2, key: 'TM-2', title: 'Set up typography scale',                  description: 'Choose a type scale (font sizes, line heights, weights). Document usage rules.',                                     columnId: colDone,            inBacklog: false, epicId: epicDesign, tagIds: [tagDesign, tagFrontend], order: 1, priority: 'medium',  createdAt: now, updatedAt: now },
    { id: tDS3, key: 'TM-3', title: 'Audit existing UI for inconsistencies',    description: 'Review all screens and catalogue spacing, color and type deviations before starting the component build.',           columnId: colDone,            inBacklog: false, epicId: epicDesign, tagIds: [tagDesign],              order: 2, priority: 'medium',  createdAt: now, updatedAt: now },
    // Development (1)
    { id: tDS4, key: 'TM-4', title: 'Build Button component',                   description: 'Implement primary, secondary, ghost and danger variants with all interactive states.',                               columnId: colDevelopment,     inBacklog: false, epicId: epicDesign, tagIds: [tagFrontend],           order: 0, priority: 'high',    createdAt: now, updatedAt: now },
    // Experimentation (1)
    { id: tDS5, key: 'TM-5', title: 'Prototype animation system',               description: 'Spike: evaluate CSS transitions vs Framer Motion for micro-interactions. Decide on approach and document findings.', columnId: colExperimentation, inBacklog: false, epicId: epicDesign, tagIds: [tagDesign, tagFrontend], order: 0, priority: 'low',     createdAt: now, updatedAt: now },
    // Blocked (1)
    { id: tDS6, key: 'TM-6', title: 'Build Icon library',                       description: 'Compile and export the icon set as SVG sprites. Blocked on final icon selection from the brand team.',              columnId: colBlocked,         inBacklog: false, epicId: epicDesign, tagIds: [tagDesign],              order: 0, priority: 'medium',  createdAt: now, updatedAt: now },
    // Discovery (1)
    { id: tDS7, key: 'TM-7', title: 'Dark mode token set',                      description: 'Research how peers handle dark mode tokens. Define the strategy before implementation.',                             columnId: colDiscovery,       inBacklog: false, epicId: epicDesign, tagIds: [tagDesign, tagFrontend], order: 0, priority: 'low',     createdAt: now, updatedAt: now },
    // Backlog (2)
    { id: tDS8, key: 'TM-8', title: 'Write component documentation',            description: "Document each component's props, usage examples and accessibility notes in Storybook.",                             columnId: '',                 inBacklog: true,  epicId: epicDesign, tagIds: [tagDesign, tagFrontend], order: 0, priority: 'low',     createdAt: now, updatedAt: now },
    { id: tDS9, key: 'TM-9', title: 'Responsive grid system',                   description: 'Design and document the column grid used across breakpoints (mobile, tablet, desktop).',                            columnId: '',                 inBacklog: true,  epicId: epicDesign, tagIds: [tagDesign],              order: 1, priority: 'lowest',  createdAt: now, updatedAt: now },

    // ── Authentication ────────────────────────────────────────────────────────

    // Done (2)
    { id: tAU1, key: 'TM-10', title: 'Design auth data model',               description: 'Define users, sessions and refresh-token tables. Document expiry and rotation policy.',                                  columnId: colDone,            inBacklog: false, epicId: epicAuth, tagIds: [tagBackend, tagSecurity],  order: 0, priority: 'highest', createdAt: now, updatedAt: now },
    { id: tAU2, key: 'TM-11', title: 'Implement sign-up endpoint',           description: 'POST /auth/register — validate email, hash password with bcrypt, create user row, return JWT.',                         columnId: colDone,            inBacklog: false, epicId: epicAuth, tagIds: [tagBackend],              order: 1, priority: 'high',    createdAt: now, updatedAt: now },
    // Development (2)
    { id: tAU3, key: 'TM-12', title: 'Implement login endpoint',             description: 'POST /auth/login — verify credentials, issue access + refresh tokens, set HttpOnly cookie.',                           columnId: colDevelopment,     inBacklog: false, epicId: epicAuth, tagIds: [tagBackend, tagSecurity],  order: 1, priority: 'high',    createdAt: now, updatedAt: now },
    { id: tAU4, key: 'TM-13', title: 'Build login UI',                       description: 'Email + password form with inline validation, loading state and error feedback.',                                       columnId: colDevelopment,     inBacklog: false, epicId: epicAuth, tagIds: [tagFrontend],             order: 2, priority: 'high',    createdAt: now, updatedAt: now },
    // Experimentation (1)
    { id: tAU5, key: 'TM-14', title: 'Evaluate passkey / WebAuthn support',  description: 'Spike: assess browser support and UX trade-offs of passkeys as a password-free alternative. Recommend go/no-go.',    columnId: colExperimentation, inBacklog: false, epicId: epicAuth, tagIds: [tagBackend, tagSecurity],  order: 1, priority: 'medium',  createdAt: now, updatedAt: now },
    // Blocked (1)
    { id: tAU6, key: 'TM-15', title: 'Token refresh middleware',             description: 'Intercept 401 responses and replay requests after refresh. Blocked until login endpoint is merged.',                   columnId: colBlocked,         inBacklog: false, epicId: epicAuth, tagIds: [tagBackend, tagFrontend], order: 1, priority: 'high',    createdAt: now, updatedAt: now },
    // Discovery (1)
    { id: tAU7, key: 'TM-16', title: 'Password reset flow',                  description: 'Map out the full user journey for forgot-password: email delivery, link expiry, edge cases.',                          columnId: colDiscovery,       inBacklog: false, epicId: epicAuth, tagIds: [tagBackend, tagFrontend], order: 1, priority: 'medium',  createdAt: now, updatedAt: now },
    // Backlog (2)
    { id: tAU8, key: 'TM-17', title: 'OAuth — Google sign-in',               description: 'Add Google OAuth2 provider as an alternative login path using the authorization code flow.',                           columnId: '',                 inBacklog: true,  epicId: epicAuth, tagIds: [tagBackend, tagSecurity],  order: 1, priority: 'low',     createdAt: now, updatedAt: now },
    { id: tAU9, key: 'TM-18', title: 'Rate limiting on auth endpoints',      description: 'Add per-IP rate limiting (5 req/min) on /auth/login and /auth/register to prevent brute force.',                      columnId: '',                 inBacklog: true,  epicId: epicAuth, tagIds: [tagBackend, tagSecurity],  order: 2, priority: 'medium',  createdAt: now, updatedAt: now },
  ],

  trashedTickets: [],
  releasedEpics: [],
  automationRules: [],
  comments: [],
  linkedItems: [],
};

/**
 * Google Drive Adapter
 *
 * Uses the Google Identity Services (GIS) library for OAuth and
 * the Google Drive REST API v3 to store a single JSON file.
 *
 * Setup (see README for details):
 *  1. Create a Google Cloud project, enable Drive API.
 *  2. Create an OAuth 2.0 Client ID (Web Application).
 *  3. Add your local dev origin to "Authorized JavaScript origins".
 *  4. Set VITE_GOOGLE_CLIENT_ID in .env.local
 */

import type { AppState, StorageAdapter } from '../types';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
const APP_FILE_NAME = 'antigravity-tasks.json';

declare global {
  interface Window {
    gapi: {
      load: (lib: string, cb: () => void) => void;
      client: {
        init: (opts: Record<string, unknown>) => Promise<void>;
        drive: {
          files: {
            list: (params: Record<string, unknown>) => Promise<{ result: { files: GDriveFile[] } }>;
            create: (params: Record<string, unknown>) => Promise<{ result: GDriveFile }>;
            update: (params: Record<string, unknown>) => Promise<{ result: GDriveFile }>;
            get: (params: Record<string, unknown>) => Promise<{ body: string }>;
          };
        };
      };
      auth2: {
        getAuthInstance: () => {
          isSignedIn: { get: () => boolean };
          signIn: () => Promise<void>;
          signOut: () => Promise<void>;
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (opts: Record<string, unknown>) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

interface GDriveFile {
  id: string;
  name: string;
}

function loadGapi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.gapi !== 'undefined') return resolve();
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

export class GoogleDriveAdapter implements StorageAdapter {
  name = 'Google Drive';
  supportsSync = true;

  private clientId: string;
  private fileId: string | null = null;
  private accessToken: string | null = null;
  private onTokenChange?: (token: string | null) => void;

  constructor(clientId: string, fileId?: string) {
    this.clientId = clientId;
    this.fileId = fileId ?? null;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  async authenticate(): Promise<void> {
    await loadGapi();
    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: SCOPES,
        callback: (response: { access_token?: string; error?: string }) => {
          if (response.error) return reject(new Error(response.error));
          this.accessToken = response.access_token ?? null;
          this.onTokenChange?.(this.accessToken);
          resolve();
        },
      });
      tokenClient.requestAccessToken();
    });
  }

  signOut(): void {
    this.accessToken = null;
    this.onTokenChange?.(null);
  }

  private authHeaders(): Record<string, string> {
    if (!this.accessToken) throw new Error('Not authenticated with Google Drive');
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  /** Find or create the app JSON file and return its Drive file ID */
  private async ensureFile(): Promise<string> {
    if (this.fileId) return this.fileId;

    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'${APP_FILE_NAME}'%20and%20trashed%3Dfalse&spaces=drive&fields=files(id,name)`,
      { headers: this.authHeaders() }
    );
    const listData = await listRes.json();
    if (listData.files && listData.files.length > 0) {
      this.fileId = listData.files[0].id;
      return this.fileId!;
    }

    // Create new empty file
    const meta = JSON.stringify({ name: APP_FILE_NAME, mimeType: 'application/json' });
    const form = new FormData();
    form.append('metadata', new Blob([meta], { type: 'application/json' }));
    form.append('file', new Blob(['{}'], { type: 'application/json' }));

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      { method: 'POST', headers: this.authHeaders(), body: form }
    );
    const createData = await createRes.json();
    this.fileId = createData.id;
    return this.fileId!;
  }

  async loadAll(): Promise<AppState> {
    const fileId = await this.ensureFile();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: this.authHeaders() }
    );
    if (!res.ok) throw new Error(`Drive load failed: ${res.status}`);
    const text = await res.text();
    if (!text || text === '{}') throw new Error('EMPTY_FILE');
    return JSON.parse(text) as AppState;
  }

  async saveAll(state: AppState): Promise<void> {
    const fileId = await this.ensureFile();
    const body = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body,
      }
    );
    if (!res.ok) throw new Error(`Drive save failed: ${res.status}`);
  }

  getFileId(): string | null {
    return this.fileId;
  }
}

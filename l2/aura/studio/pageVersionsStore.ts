/// <mls fileReference="_102020_/l2/aura/studio/pageVersionsStore.ts" enhancement="_blank" />
// Where the page timeline lives: the browser's IndexedDB, in a database of its own, one record per page.
//
// NOT the project's files: an edit is local until the save (studio-edit-stops-at-local), and a version written as a
// project file would dirty the draft at every edit and travel with the save. The timeline is the same kind of thing
// as the edits it records — of this browser, until saved; the saved past comes from git (see pageVersions).
//
// Every failure here is SILENT for the edit: the timeline is a safety net, never a reason for an edit to fail.

import {
  DEFAULT_LIMITS, pageVersionKey, pushVersion, trimProject, PROJECT_MAX_BYTES,
  type IPageVersion, type IPageVersionLimits, type IPageVersionsRecord,
} from '/_102020_/l2/aura/studio/pageVersionsCore.js';

export interface IPageRef {
  project: number;
  folder: string;
  shortName: string;
}

/** The few operations the timeline needs from a store — what lets the tests use a map. */
export interface IPageVersionsBackend {
  get(key: string): Promise<IPageVersionsRecord | null>;
  put(record: IPageVersionsRecord): Promise<void>;
  /** Every record of a project (for the project budget). */
  listProject(project: number): Promise<IPageVersionsRecord[]>;
}

const DB_NAME = 'aura-page-versions';
const DB_VERSION = 1;
const STORE = 'pages';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** The IndexedDB backend. Opened on first use; a failure to open is remembered (no retry storm). */
export function indexedDbBackend(): IPageVersionsBackend {
  let opening: Promise<IDBDatabase> | null = null;
  const db = (): Promise<IDBDatabase> => {
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
        const open = indexedDB.open(DB_NAME, DB_VERSION);
        open.onupgradeneeded = () => {
          const store = open.result.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('project', 'project', { unique: false });
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
        open.onblocked = () => reject(new Error('IndexedDB blocked'));
      });
    }
    return opening;
  };
  return {
    async get(key) {
      const tx = (await db()).transaction(STORE, 'readonly');
      return (await request(tx.objectStore(STORE).get(key)) as IPageVersionsRecord | undefined) ?? null;
    },
    async put(record) {
      const tx = (await db()).transaction(STORE, 'readwrite');
      await request(tx.objectStore(STORE).put(record));
    },
    async listProject(project) {
      const tx = (await db()).transaction(STORE, 'readonly');
      return await request(tx.objectStore(STORE).index('project').getAll(project)) as IPageVersionsRecord[];
    },
  };
}

/** A backend in memory: the tests', and the fallback is NOT this (no IndexedDB = no timeline, said on screen). */
export function memoryBackend(): IPageVersionsBackend & { records: Map<string, IPageVersionsRecord> } {
  const records = new Map<string, IPageVersionsRecord>();
  const clone = (r: IPageVersionsRecord): IPageVersionsRecord => ({ ...r, versions: r.versions.map(v => ({ ...v })) });
  return {
    records,
    async get(key) { const r = records.get(key); return r ? clone(r) : null; },
    async put(record) { records.set(record.key, clone(record)); },
    async listProject(project) { return [...records.values()].filter(r => r.project === project).map(clone); },
  };
}

export class PageVersionsStore {
  /** false once the backend failed: the panel says "history unavailable". */
  available = true;

  constructor(
    private readonly backend: IPageVersionsBackend,
    private readonly limits: IPageVersionLimits = DEFAULT_LIMITS,
    private readonly projectMaxBytes: number = PROJECT_MAX_BYTES,
  ) {}

  /** The versions of a page, oldest first; [] when there are none or the store failed. */
  async list(page: IPageRef): Promise<IPageVersion[]> {
    try {
      return (await this.backend.get(pageVersionKey(page)))?.versions ?? [];
    } catch (error) {
      this.fail(error);
      return [];
    }
  }

  /**
   * Adds a version (pushVersion's rules) and trims the project to its budget. Returns the page's list after it, or
   * null when the store failed.
   */
  async append(page: IPageRef, version: IPageVersion): Promise<IPageVersion[] | null> {
    try {
      const key = pageVersionKey(page);
      const current = (await this.backend.get(key))?.versions ?? [];
      const versions = pushVersion(current, version, this.limits);
      await this.backend.put({ key, project: page.project, versions });
      const trimmed = trimProject(await this.backend.listProject(page.project), this.projectMaxBytes);
      for (const record of trimmed) await this.backend.put(record);
      return trimmed.find(r => r.key === key)?.versions ?? versions;
    } catch (error) {
      this.fail(error);
      return null;
    }
  }

  private fail(error: unknown): void {
    if (this.available) console.warn('[pageVersions] the timeline store failed; edits go on without it:', error);
    this.available = false;
  }
}

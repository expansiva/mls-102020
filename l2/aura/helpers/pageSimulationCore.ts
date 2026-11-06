/// <mls fileReference="_102020_/l2/aura/helpers/pageSimulationCore.ts" enhancement="_blank" />
// The simulation of the page on screen, without the app: what is simulated, what was there before, when a value is
// put back. The store is injected, so the tests run it on a Map. Wired to collabState in studio/studioPageSimulation,
// which also says WHY the simulation does not live in the "States" tab.

/** The Aura page identity, as much as the simulation needs. */
export interface ISimulationPage {
  project: number;
  folder: string | null;
  shortName: string;
}

/**
 * How long after a live update a simulated value is put back when the app overwrites it.
 *
 * Long enough for a query to come back; after it, an overwrite is the app's and is only reported.
 */
export const REASSERT_MS = 10000;

/** Where the simulated keys are published, so the fact is visible outside the tab (the class picker's badge). */
export const SIMULATED_KEYS_STATE = 'aura.scenario.simulated';

/** What was there before the first simulated write, so restoring is exact. */
export interface ISimulation {
  original: unknown;
  applied: unknown;
}

/** The store the simulation writes to: collabState in the app, a Map in the tests. */
export interface ISimulationStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  watch(keys: string[], onChange: (key: string, value: unknown) => void): () => void;
  now(): number;
  later(run: () => void): void;
}

/** `project:folder:shortName`, or '' for no page. */
export function pageIdOf(page: ISimulationPage | null | undefined): string {
  return page ? `${page.project}:${page.folder}:${page.shortName}` : '';
}

export class PageSimulation {
  private _pageId = '';
  private _active: string | null = null;
  private readonly _simulated = new Map<string, ISimulation>();
  private _reassertUntil = 0;
  private _unwatch: (() => void) | null = null;
  private readonly _listeners = new Set<() => void>();

  constructor(private readonly store: ISimulationStore) {}

  /** The situation on for `pageId`, or null (normal). */
  activeFor(pageId: string): string | null {
    return pageId === this._pageId ? this._active : null;
  }

  /** The simulated keys of `pageId`, with what was there before. */
  simulatedFor(pageId: string): ReadonlyMap<string, ISimulation> {
    return pageId === this._pageId ? this._simulated : new Map();
  }

  /** Called on every change; returns the unsubscribe. */
  onChange(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  /** Writes one simulated value on `pageId` (a simulation of another page is undone first). */
  write(pageId: string, key: string, value: unknown): void {
    this._enter(pageId);
    this._write(key, value);
    this._changed();
  }

  /**
   * Turns a situation on (null = normal): the keys of the previous one (`undo`) are put back first, then `writes`
   * are applied. Only one situation is on at a time; the scene is not touched.
   */
  setSituation(pageId: string, id: string | null, undo: string[], writes: Record<string, unknown>): void {
    this._enter(pageId);
    for (const key of undo) this._restore(key);
    this._active = id;
    for (const [key, value] of Object.entries(writes)) this._write(key, value);
    this._changed();
  }

  /** Everything back to what the app had. */
  restoreAll(): void {
    const had = this._simulated.size > 0 || this._active !== null;
    this._active = null;
    for (const key of [...this._simulated.keys()]) this._restore(key);
    if (had) this._changed();
  }

  /** The page on screen is now `pageId`: a simulation of another page ends. */
  pageShown(pageId: string): void {
    if (pageId !== this._pageId) {
      this.restoreAll();
      this._pageId = pageId;
    }
  }

  /** A live update remounted the page: put every simulation back, and hold it for a while (REASSERT_MS). */
  reapply(): void {
    if (!this._simulated.size) return;
    this._reassertUntil = this.store.now() + REASSERT_MS;
    for (const [key, simulation] of this._simulated) this.store.set(key, simulation.applied);
    this._notify();
  }

  private _enter(pageId: string): void {
    if (pageId !== this._pageId) {
      this.restoreAll();
      this._pageId = pageId;
    }
  }

  private _write(key: string, value: unknown): void {
    const existing = this._simulated.get(key);
    // The ORIGINAL is captured once: a second write must not make "restore" put back the first simulation.
    const original = existing ? existing.original : this.store.get(key);
    this._simulated.set(key, { original, applied: value });
    this.store.set(key, value);
  }

  private _restore(key: string): void {
    const simulation = this._simulated.get(key);
    if (!simulation) return;
    this._simulated.delete(key);
    this.store.set(key, simulation.original);
  }

  /** A simulated key changed: right after a live update it is put back, otherwise it is only reported. */
  private _onWrote(key: string, value: unknown): void {
    const simulation = this._simulated.get(key);
    if (simulation && value !== simulation.applied && this.store.now() < this._reassertUntil) {
      // After the app's own write has finished, never inside it.
      this.store.later(() => {
        const current = this._simulated.get(key);
        if (current && this.store.get(key) !== current.applied) this.store.set(key, current.applied);
      });
      return;
    }
    this._notify();
  }

  private _changed(): void {
    this._unwatch?.();
    this._unwatch = null;
    const keys = [...this._simulated.keys()];
    if (keys.length) this._unwatch = this.store.watch(keys, (key, value) => this._onWrote(key, value));
    this.store.set(SIMULATED_KEYS_STATE, keys);
    this._notify();
  }

  private _notify(): void {
    for (const listener of this._listeners) listener();
  }
}


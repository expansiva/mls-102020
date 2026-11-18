/// <mls fileReference="_102020_/l2/aura/studio/studioAdvancedMode.ts" enhancement="_blank" />
// The Studio's "advanced mode" and what lives behind it — today, the layout lines (studioLayoutLines).
//
// OFF BY DEFAULT. With it off nothing of what it gates shows up or runs: no chips, no shortcut, no
// layer over the page, no measuring. A person who never asked for it pays nothing.
//
// A PREFERENCE OF THE PERSON, not of the project or the session: localStorage, read and written
// defensively (storage can be blocked, and then the choice lasts the session) — the same as the
// docked/floating mode of the class picker. Not collabState: nothing else in the app reads it, and the
// state keeps a log of every value it is handed.
//
// One module-level store with listeners, because its two readers are mounted independently — the
// Pages plugin (the switch and the chips) and the editor (the layer) — and neither holds the other.

/** The three layers, independent of each other. */
export type LayoutLine = 'outline' | 'spacing' | 'grid';

export interface IAdvancedPrefs {
  /** The gate. False by default. */
  advanced: boolean;
  /** Which layers are on (only drawn while `advanced`). */
  lines: LayoutLine[];
  /** The layers the shortcut brings back when it turns them on again. */
  lastLines: LayoutLine[];
  /** Outlines: one colour instead of one per depth. */
  outlineMono: boolean;
  /** Spacing: the px values on everything, instead of only on the hovered element and its children. */
  valuesAlways: boolean;
  /** Grid: the 12-column reference over the page. */
  twelveColumns: boolean;
  /** Grid: the 8px rhythm lines. */
  baseline: boolean;
}

export const LAYOUT_LINES: readonly LayoutLine[] = ['outline', 'spacing', 'grid'];

const KEY = 'aura.studio.advanced';

export const DEFAULT_PREFS: IAdvancedPrefs = {
  advanced: false,
  lines: [],
  lastLines: ['outline'],
  outlineMono: false,
  valuesAlways: false,
  twelveColumns: false,
  baseline: false,
};

/** Whatever storage holds, as prefs: unknown keys dropped, bad values back to the default. */
export function parsePrefs(raw: string | null): IAdvancedPrefs {
  if (!raw) return { ...DEFAULT_PREFS };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_PREFS };
  }
  if (!data || typeof data !== 'object') return { ...DEFAULT_PREFS };
  const lines = (value: unknown, fallback: LayoutLine[]): LayoutLine[] => (Array.isArray(value)
    ? LAYOUT_LINES.filter((line) => value.includes(line))
    : fallback);
  const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
  return {
    advanced: flag(data.advanced, DEFAULT_PREFS.advanced),
    lines: lines(data.lines, DEFAULT_PREFS.lines),
    lastLines: lines(data.lastLines, DEFAULT_PREFS.lastLines),
    outlineMono: flag(data.outlineMono, DEFAULT_PREFS.outlineMono),
    valuesAlways: flag(data.valuesAlways, DEFAULT_PREFS.valuesAlways),
    twelveColumns: flag(data.twelveColumns, DEFAULT_PREFS.twelveColumns),
    baseline: flag(data.baseline, DEFAULT_PREFS.baseline),
  };
}

/** The layers that are actually DRAWN: none while the gate is closed. */
export function activeLines(prefs: IAdvancedPrefs): LayoutLine[] {
  return prefs.advanced ? [...prefs.lines] : [];
}

/** One chip on or off. Remembers the set for the shortcut whenever something is left on. */
export function toggleLine(prefs: IAdvancedPrefs, line: LayoutLine): IAdvancedPrefs {
  const on = prefs.lines.includes(line);
  const lines = LAYOUT_LINES.filter((each) => (each === line ? !on : prefs.lines.includes(each)));
  return { ...prefs, lines, lastLines: lines.length ? lines : prefs.lastLines };
}

/** The shortcut: everything off when something is on; otherwise the last set back. */
export function toggleAllLines(prefs: IAdvancedPrefs): IAdvancedPrefs {
  if (prefs.lines.length) return { ...prefs, lines: [], lastLines: [...prefs.lines] };
  const back = prefs.lastLines.length ? prefs.lastLines : DEFAULT_PREFS.lastLines;
  return { ...prefs, lines: [...back] };
}

// ─── The store ────────────────────────────────────────────────────────────────

type Listener = (prefs: IAdvancedPrefs) => void;

function read(): IAdvancedPrefs {
  try {
    return parsePrefs(localStorage.getItem(KEY));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

let current: IAdvancedPrefs | null = null;
const listeners = new Set<Listener>();

export function getAdvancedPrefs(): IAdvancedPrefs {
  if (!current) current = read();
  return current;
}

export function setAdvancedPrefs(next: IAdvancedPrefs): void {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage blocked: the choice lasts the session */ }
  for (const listener of [...listeners]) listener(next);
}

export function updateAdvancedPrefs(change: (prefs: IAdvancedPrefs) => IAdvancedPrefs): void {
  setAdvancedPrefs(change(getAdvancedPrefs()));
}

/** Called now with the current prefs and on every change. Returns the unsubscribe. */
export function onAdvancedPrefsChange(listener: Listener): () => void {
  listeners.add(listener);
  listener(getAdvancedPrefs());
  return () => { listeners.delete(listener); };
}

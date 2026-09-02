/// <mls fileReference="_102020_/l2/aura/helpers/auraState.ts" enhancement="_blank" />

import { getState, setState, initState } from '/_102029_/l2/collabState.js';

export interface IAuraPage {
    project: number;
    shortName: string;
    folder: string | null;
    level: number;
    extension: string;
}

/** The element the user has selected in the running app, as DATA. */
export interface IAuraEditSelection {
    tag: string;
    /** File that would receive an edit; null while it could not be resolved. */
    file: { project: number; shortName: string; folder: string } | null;
    /** The element's class attribute, exactly as authored. */
    literal: string;
    editable: boolean;
    /** Why it cannot be edited, already translated. */
    refusal?: string;
}

/**
 * What the in-place editor is doing, for whoever wants to act on it.
 *
 * A PROJECTION, not the editor's state: only the editor writes it, and only it can act on a step —
 * applying one needs the Monaco models, the anchors and the write path. What everyone else wants is
 * the three answers here.
 *
 * Everything is plain data on purpose. `setState` keeps every value it is given in a 10.000-entry
 * log, so an element, a WeakRef or a model parked here would be pinned for the rest of the session —
 * which would also defeat the WeakRef the undo stack uses precisely to avoid holding dead DOM.
 */
export interface IAuraEdit {
    selection: IAuraEditSelection | null;
    /** How deep the undo stack is, and what the next step in each direction would be (translated). */
    history: { undo: number; redo: number; nextUndo: string; nextRedo: string };
    /** Files with a local edit — "there is something to save", not "it is saved". */
    dirty: string[];
}

export const EMPTY_AURA_EDIT: IAuraEdit = {
    selection: null,
    history: { undo: 0, redo: 0, nextUndo: '', nextRedo: '' },
    dirty: [],
};

export interface IAuraState {
    actualProject: number | null;
    actualModule: string | null;
    // Effective language of the actual module. Kept as the pub/sub key ('aura.actualLanguage')
    // and as migration seed for states saved before actualLanguageByModule existed.
    actualLanguage: string | null;
    // Language per module (moduleName → BCP-47 code) — the source of truth since languages
    // moved from project.json to l4/<module>/module.defs.ts.
    actualLanguageByModule: Record<string, string> | null;
    actualDevice: string | null;
    actualLayout: number | null;
    actualDesignSystem: number | null;
    /**
     * Header the app boots — the `activeProfile` of `clientShell.regions.header` in l5/config.json.
     *
     * NOT persisted with the rest of the aura state: the config is the truth, and a copy in
     * localStorage would go stale the moment someone activates another header (or pulls the project).
     * Whoever reads the config sets it (the l5 Header knob does, on load and on activation).
     */
    actualHeader: string | null;
    actualPage: IAuraPage | null;
    /**
     * The in-place editor's projection — a SIBLING of actualPage, deliberately not inside it.
     *
     * Three reasons, all properties of `actualPage` and none of them about the editor: it is
     * persisted per project (an editing session must not survive a reload), switching module resets
     * it to null (the selection would vanish through a mechanism nobody reads in the editor), and
     * writing a nested field replaces the whole object — which would wake servicePreview,
     * serviceGenome and selectPage on every click of the picker.
     */
    edit: IAuraEdit;
}

const STATE_KEY = 'aura';

function getActualProject(): number | null {
    return mls.actualProject || null;
}

function getActualModule(): string | null {
    return loadAuraProject(getActualProject())?.actualModule ?? null;
}

function getStoredLanguage(): string | null {
    return loadAuraProject(getActualProject())?.actualLanguage ?? null;
}

function getStoredLanguageByModule(): Record<string, string> | null {
    return loadAuraProject(getActualProject())?.actualLanguageByModule ?? null;
}

function getActualDevice(): string | null {
    return loadAuraProject(getActualProject())?.actualDevice ?? null;
}

function getActualLayout(): number | null {
    return loadAuraProject(getActualProject())?.actualLayout ?? null;
}

function getActualDesignSystem(): number | null {
    return loadAuraProject(getActualProject())?.actualDesignSystem ?? null;
}

function getActualPage(): IAuraPage | null {
    const project = getActualProject();
    const entry = loadAuraProject(project);
    return validAuraPage(entry?.actualPage ?? null, project, entry?.actualModule ?? null);
}

/**
 * A page read back from localStorage is only worth restoring while it still EXISTS — the module
 * may have been renamed or removed, the page deleted, or the entry may belong to another project.
 * Restoring a ghost page makes every consumer (preview, genome, selectPage) act on a file that
 * is not there.
 *
 * The check is the in-memory stor index (the same source selectPage/molecules enumerate). While
 * that index is EMPTY — cold boot — absence is not proof, so the stored page is kept.
 */
function validAuraPage(page: IAuraPage | null, project: number | null, module?: string | null): IAuraPage | null {
    if (!page) return null;
    if (project && page.project !== project) return null; // entry from another project
    // The first folder segment IS the module (parseAuraPageSource). An entry saved before the
    // module switch started clearing the page can carry a page of a DIFFERENT module — the
    // module is the scope, so the page is what gets dropped.
    if (module && (page.folder ?? '').split('/')[0] !== module) return null;
    const index = (mls?.stor?.files ?? null) as Record<string, mls.stor.IFileInfo> | null;
    if (!index) return page;
    const files = Object.values(index);
    if (!files.length) return page; // index not loaded yet — cannot disprove
    const exists = files.some(f =>
        f.project === page.project
        && f.shortName === page.shortName
        && (f.folder ?? '') === (page.folder ?? ''));
    return exists ? page : null;
}

export function AuraInitState(): void {
    if (getAuraState()) return;
    initState(STATE_KEY, {
        actualProject: getActualProject(),
        actualModule: getActualModule(),
        actualLanguage: getStoredLanguage(),
        actualLanguageByModule: getStoredLanguageByModule(),
        actualDevice: getActualDevice(),
        actualLayout: getActualLayout(),
        actualDesignSystem: getActualDesignSystem(),
        // Read from l5/config.json by the Header knob; there is nothing to seed it from here.
        actualHeader: null,
        actualPage: getActualPage(),
        // Nothing to seed: it is the running editor that fills this, and it starts empty.
        edit: { ...EMPTY_AURA_EDIT },
    } satisfies IAuraState);
}

export function getAuraState(): IAuraState {
    return getState(STATE_KEY) as IAuraState;
}

interface ParsedAuraPage {
    actualPage: IAuraPage;
    module: string | null;
    device: string | null;
    layout: number;
    designSystem: number;
}

/**
 * Parse a compiled page entrypoint or a config source path into the aura page identity.
 * Accepts both the runtime entrypoint (`/_102045_/l2/cafeFlow/web/desktop/page11/kitchenQueue.js`)
 * and the l0/config.json source (`l2/cafeFlow/web/desktop/page11/kitchenQueue.ts`).
 * The folder encodes module (first segment), device (segments before the variation,
 * e.g. `web/desktop`) and the variation folder `page<layout><designSystem>` (page11 →
 * layout 1, DS 1). Returns null when the path is not a recognizable aura page.
 */
function parseAuraPageSource(project: number, source: string): ParsedAuraPage | null {
    if (!project || !source) return null;
    const path = source.trim().replace(/^\//, '').replace(/^_\d+_\//, '');
    const match = path.match(/^l(\d+)\/(.+)\.(?:ts|js)$/);
    if (!match) return null;

    const level = parseInt(match[1], 10);
    const afterLevel = match[2];
    const lastSlash = afterLevel.lastIndexOf('/');
    if (lastSlash < 0) return null;

    const folder = afterLevel.substring(0, lastSlash);
    const shortName = afterLevel.substring(lastSlash + 1);
    if (!shortName) return null;

    const segments = folder.split('/');
    const module = segments[0] || null;
    const variationSeg = segments[segments.length - 1] ?? '';
    const variation = variationSeg.match(/^page(\d)(\d)$/);
    const layout = variation ? parseInt(variation[1], 10) : 1;
    const designSystem = variation ? parseInt(variation[2], 10) : 1;
    const device = segments.slice(1, variation ? -1 : undefined).join('/') || null;

    const actualPage: IAuraPage = { project, shortName, folder, level, extension: '.ts' };
    return { actualPage, module, device, layout, designSystem };
}

/**
 * Seed the Aura state from the running app's current page (studio-mode entry).
 * The Aura shell resolves the active route's page source and calls this so the studio
 * services (which read getAuraState()) operate on the page the user is looking at.
 * Fills actualProject + actualPage and the module/device/variation the folder implies.
 * @returns the resolved page, or null when the source is not a recognizable aura page.
 */
export function setAuraStateFromPageSource(project: number, source: string): IAuraPage | null {
    const parsed = parseAuraPageSource(project, source);
    if (!parsed) return null;

    // Establish the full state shape once (initState never overwrites an existing key);
    // the setAuraState calls below then apply the values and notify any live subscribers.
    if (!getAuraState()) {
        initState(STATE_KEY, {
            actualProject: project,
            actualModule: parsed.module,
            actualLanguage: null,
            actualLanguageByModule: null,
            actualDevice: parsed.device,
            actualLayout: parsed.layout,
            actualDesignSystem: parsed.designSystem,
            actualHeader: null,
            actualPage: parsed.actualPage,
            edit: { ...EMPTY_AURA_EDIT },
        } satisfies IAuraState);
    }

    setAuraState('actualProject', project);
    setAuraState('actualModule', parsed.module);
    setAuraState('actualDevice', parsed.device);
    setAuraState('actualLayout', parsed.layout);
    setAuraState('actualDesignSystem', parsed.designSystem);
    setAuraState('actualPage', parsed.actualPage);
    return parsed.actualPage;
}

export function setAuraState<K extends keyof IAuraState>(key: K, value: IAuraState[K]): void {
    const previousModule = key === 'actualModule' ? (getAuraState()?.actualModule ?? null) : null;
    setState(`${STATE_KEY}.${key}`, value);
    if (key === 'actualModule') {
        // Switching module changes the EFFECTIVE language — re-emit 'aura.actualLanguage' so
        // existing subscribers (e.g. servicePreview) keep working without a new key.
        const effective = getActualLanguage(value as string | null);
        if (effective) setState(`${STATE_KEY}.actualLanguage`, effective);
        // The page BELONGS to the module — keeping it across a module switch leaves every
        // consumer pointing at a page of the previous module. Callers that set both
        // (setAuraStateFromPageSource, restoreAuraProject) set the module FIRST, so the page
        // they carry still lands after this reset.
        if (previousModule !== (value as string | null)) setState(`${STATE_KEY}.actualPage`, null);
    }
}

// ─── The in-place editor's projection ─────────────────────────────────
//
// Written ONLY by the editor (mls-102020/l2/aura/studio/studioEditor.ts). Anyone else reads.
//
// Each setter writes its own leaf so the notification is precise: a change of selection wakes whoever
// asked for `aura.edit.selection` and nobody else. Writing the `edit` object whole would wake all
// three, which on a click-by-click signal is the difference between a subscription and a firehose.

/**
 * The state may not exist yet when the editor starts.
 *
 * `AuraInitState` is called by the SERVICES, and in the client app the editor can arm before any of
 * them ran. It is NOT enough to call initState again: on an existing key it REPLACES the object,
 * which would wipe the project/module/page that are already there.
 */
function ensureEditState(): void {
    if (!getAuraState()) AuraInitState();
    if (!getAuraState()?.edit) setState(`${STATE_KEY}.edit`, { ...EMPTY_AURA_EDIT });
}

export function setEditSelection(selection: IAuraEditSelection | null): void {
    ensureEditState();
    setState(`${STATE_KEY}.edit.selection`, selection);
}

export function setEditHistory(history: IAuraEdit['history']): void {
    ensureEditState();
    setState(`${STATE_KEY}.edit.history`, history);
}

/** Adds a file to the dirty list. Idempotent: the same file edited twice is still one entry. */
export function addEditDirty(file: string): void {
    ensureEditState();
    const dirty = getAuraState()?.edit?.dirty ?? [];
    if (dirty.includes(file)) return;
    setState(`${STATE_KEY}.edit.dirty`, [...dirty, file]);
}

/** What the editor is on right now, for a consumer that reads instead of subscribing. */
export function getAuraEdit(): IAuraEdit {
    return getAuraState()?.edit ?? EMPTY_AURA_EDIT;
}

// ─── nav-3 menu titles ────────────────────────────────────────────────
// The service tells the user WHICH project/module it is acting on — the same scope its
// knobs edit. Consumed as `menu.title` + `menu.updateTitle?.()`.

/** Project scope (l5): the project id — '102045'. Empty while there is no project. */
export function projectScopeTitle(): string {
    const project = getAuraState()?.actualProject;
    return project ? String(project) : '';
}

/**
 * Module scope (l3/l4): '<project>-<module>' — '102045-cafeFlow'.
 * `module` overrides the state (the genome knows the module of the page ON SCREEN, which is
 * fresher than aura state when pages of different modules are opened). Falls back to the
 * project alone while no module is resolvable, and to '' with no project.
 */
export function moduleScopeTitle(module?: string | null): string {
    const state = getAuraState();
    const project = state?.actualProject;
    if (!project) return '';
    const name = module || state?.actualModule;
    return name ? `${project}-${name}` : String(project);
}

/**
 * Language of a module (or of the actual module when omitted).
 * Falls back to the legacy single `actualLanguage` when the module has no entry yet
 * (migration seed of states saved before actualLanguageByModule existed).
 * No module resolvable → null (consumer falls back to the 1st language of module.defs).
 */
export function getActualLanguage(module?: string | null): string | null {
    const state = getAuraState();
    if (!state) return null;
    const target = module ?? state.actualModule;
    if (!target) return null;
    return state.actualLanguageByModule?.[target] ?? state.actualLanguage ?? null;
}

export function setActualLanguage(module: string, language: string | null): void {
    const state = getAuraState();
    const byModule = { ...(state?.actualLanguageByModule ?? {}) };
    if (language) byModule[module] = language;
    else delete byModule[module];
    setAuraState('actualLanguageByModule', byModule);
    if (!state?.actualModule || state.actualModule === module) {
        setAuraState('actualLanguage', language);
    }
}

// ─── localStorage ─────────────────────────────────────────────────────

const LS_KEY = 'AuraProjects';

// actualHeader is deliberately out: it mirrors l5/config.json, so persisting it would mean
// restoring a header that the config may no longer point at.
// `edit` is out for a stronger reason: it is a live projection of an editing SESSION. Restoring a
// selection into a page that may not even be mounted would hand every consumer a ghost.
type IAuraProjectEntry = Omit<IAuraState, 'actualProject' | 'actualHeader' | 'edit'>;
type AuraProjectsStore = Record<number, IAuraProjectEntry>;

function readStore(): AuraProjectsStore {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
    } catch {
        return {};
    }
}

function writeStore(store: AuraProjectsStore): void {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
}

export function saveAuraProject(): void {
    const state = getAuraState();
    const project = state.actualProject;
    if (!project) return;
    const store = readStore();
    store[project] = {
        actualModule: state.actualModule,
        actualLanguage: state.actualLanguage,
        actualLanguageByModule: state.actualLanguageByModule,
        actualDevice: state.actualDevice,
        actualLayout: state.actualLayout,
        actualDesignSystem: state.actualDesignSystem,
        actualPage: state.actualPage,
    };
    writeStore(store);
}

export function deleteAuraProject(project: number): void {
    const store = readStore();
    if (!store[project]) return;
    delete store[project];
    writeStore(store);
}

export function loadAuraProject(project: number | null): IAuraProjectEntry | null {
    if (!project) return null;
    const store = readStore();
    return store[project] ?? null;
}

export function restoreAuraProject(project: number): void {
    const entry = loadAuraProject(project);
    if (!entry) return;
    setAuraState('actualProject', project);
    // Entries saved before actualLanguageByModule existed lack the key — reset it
    // explicitly so the previous project's per-module map never leaks across projects.
    if (!('actualLanguageByModule' in entry)) setAuraState('actualLanguageByModule', null);
    // Module FIRST (setting it resets the page) and page LAST, explicitly — never rely on the
    // key order of the stored entry. Same rule as the initial load: a page that no longer
    // exists is not restored.
    setAuraState('actualModule', entry.actualModule);
    (Object.keys(entry) as (keyof IAuraProjectEntry)[]).forEach(key => {
        if (key === 'actualModule' || key === 'actualPage') return;
        setAuraState(key, entry[key]);
    });
    setAuraState('actualPage', validAuraPage(entry.actualPage, project, entry.actualModule));
}

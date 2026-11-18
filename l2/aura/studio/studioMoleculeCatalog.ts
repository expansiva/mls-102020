/// <mls fileReference="_102020_/l2/aura/studio/studioMoleculeCatalog.ts" enhancement="_blank" />
// "Ver catálogo" in the Studio's "Moléculas" panel: opens the group's index page (102040,
// `molecules/<group>/index`) in a drawer over the page preview, so every variant of the group can be
// seen at once, running, with the index's own example data.
//
// The index is mounted AS IT IS — in English, with its own fixed colors and example data. It is a
// generated page; changing it means changing its generator, which this drawer does not do.
//
// The drawer is a fixed layer on the body, pinned to the preview region's rectangle, and carries the
// in-place editor's chrome class: the editor neither selects nor counts what is inside it. No
// iframe — the Studio document already has the molecules' styles and the Tailwind JIT.

import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

/** The class the in-place editor uses for its own chrome: excluded from selection, counts and tree. */
const EDITOR_CHROME_CLASS = 'se-control';

// ─── Pure decisions ──────────────────────────────────────────────────

/** The index file of a group folder of the molecules project (`molecules/<group>/index`). */
export function catalogFileOf(project: number, groupFolder: string): { project: number; folder: string; shortName: string } | null {
    const folder = groupFolder.replace(/^\/+|\/+$/g, '');
    if (!project || !folder) return null;
    return { project, folder, shortName: 'index' };
}

/**
 * Where the drawer goes: over the VISIBLE part of the preview region, as wide as it allows up to
 * `maxWidth`, against its right edge.
 *
 * The region is as tall as the page it holds, and a long page runs past the window; a drawer that
 * size had its bottom out of sight, so its own scroll could never reach the end and the window
 * scrolled instead. Clamped to the viewport, the drawer's body is the only thing that scrolls. A
 * region with nothing visible gives null — there is nothing to cover.
 */
export function drawerRect(
    region: { left: number; top: number; width: number; height: number },
    viewport: { width: number; height: number },
    maxWidth = 760,
): { left: number; top: number; width: number; height: number } | null {
    const left = Math.max(region.left, 0);
    const right = Math.min(region.left + region.width, viewport.width);
    const top = Math.max(region.top, 0);
    const bottom = Math.min(region.top + region.height, viewport.height);
    const visibleWidth = right - left;
    const height = bottom - top;
    if (visibleWidth <= 0 || height <= 0) return null;
    const width = Math.min(maxWidth, Math.round(visibleWidth * 0.92));
    return { left: right - width, top, width, height };
}

// ─── DOM work ────────────────────────────────────────────────────────

export interface IMoleculeCatalogRequest {
    /** The preview region the drawer covers. */
    region: HTMLElement;
    /** Translated group title, for the drawer header. */
    title: string;
    /** Group id, shown small next to the title. */
    group: string;
    variantCount: number;
    /** Module of the index page, and the tag it defines. */
    moduleUrl: string;
    tag: string;
    /** The group's molecule modules, at the SAME url the pages import them (`….js`). */
    moleculeUrls: string[];
}

/**
 * Loads an index page without re-registering the molecules it shows.
 *
 * The index imports its molecules WITHOUT the `.js` extension (`…/groupviewtable/ml-data-table`),
 * while pages and the preview import `…/ml-data-table.js`. For the browser those are two modules, so
 * the molecule's code runs a second time and its `@customElement` throws: a tag can be defined once
 * per window. Two steps keep both worlds working:
 *
 * 1. The group's molecules are loaded first at the pages' url. Every tag is then defined by the
 *    module a page will import later, so a swap to a variant first seen in the catalog finds the
 *    module already in the cache, instead of evaluating it again and throwing.
 * 2. While the index itself loads, a second `define` of a tag that already exists is skipped
 *    instead of thrown. The window is only this import; a tag not yet defined goes through.
 */
async function loadIndexModule(indexUrl: string, moleculeUrls: readonly string[]): Promise<void> {
    await Promise.allSettled(moleculeUrls.map((url) => import(url)));
    const registry = customElements;
    const previous = registry.define;
    registry.define = function defineOnce(name: string, ctor: CustomElementConstructor, options?: ElementDefinitionOptions) {
        if (registry.get(name)) return;
        return previous.call(registry, name, ctor, options);
    };
    try {
        await import(indexUrl);
    } finally {
        registry.define = previous;
    }
}

export class MoleculeCatalog {
    private root: HTMLElement | null = null;
    private region: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;
    /** Bumped on every open/close: a module that finishes loading after the drawer closed must not mount. */
    private token = 0;

    get isOpen(): boolean {
        return this.root !== null;
    }

    async open(req: IMoleculeCatalogRequest): Promise<void> {
        this.close();
        const token = ++this.token;
        this.region = req.region;

        const root = document.createElement('div');
        root.className = `${EDITOR_CHROME_CLASS} fixed flex flex-col shadow-2xl border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950`;
        // Above the editor's selection outline and its label (z-index 99990/99991), which are fixed
        // layers on the body too: the drawer covers the page, so it covers the page's marking.
        root.style.zIndex = '99992';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', req.title);

        const header = document.createElement('div');
        header.className = 'shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900';
        const titles = document.createElement('div');
        titles.className = 'flex-1 min-w-0';
        const title = document.createElement('div');
        title.className = 'text-sm font-semibold text-gray-800 dark:text-gray-100 truncate';
        title.textContent = req.title;
        const sub = document.createElement('div');
        sub.className = 'text-[11px] text-gray-400 dark:text-gray-500 truncate';
        sub.textContent = `${t('catalog.variants', { count: req.variantCount })} · ${req.group}`;
        titles.append(title, sub);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'shrink-0 p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800';
        close.setAttribute('aria-label', t('catalog.close'));
        close.title = t('catalog.close');
        close.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        close.addEventListener('click', () => this.close());
        header.append(titles, close);

        const body = document.createElement('div');
        body.className = 'flex-1 overflow-auto';
        const status = document.createElement('div');
        status.className = 'p-6 text-sm text-gray-400 dark:text-gray-500';
        status.textContent = t('catalog.loading');
        body.append(status);

        root.append(header, body);
        document.body.append(root);
        this.root = root;
        this.place();
        this.resizeObserver = new ResizeObserver(() => this.place());
        this.resizeObserver.observe(req.region);
        window.addEventListener('resize', this.place);
        // The preview scrolls inside its own containers: any scroll can move the region on screen.
        window.addEventListener('scroll', this.place, true);
        document.addEventListener('keydown', this.onKey, true);
        close.focus();

        let ok = true;
        try {
            await loadIndexModule(req.moduleUrl, req.moleculeUrls);
            if (!customElements.get(req.tag)) await customElements.whenDefined(req.tag);
        } catch (error) {
            ok = false;
            console.warn(`[moleculeCatalog] could not load ${req.moduleUrl}`, error);
        }
        if (token !== this.token) return;
        if (!ok) {
            status.textContent = t('catalog.failed');
            status.className = 'p-6 text-sm text-amber-600 dark:text-amber-400';
            return;
        }
        status.remove();
        body.append(document.createElement(req.tag));
    }

    close(): void {
        this.token++;
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        window.removeEventListener('resize', this.place);
        window.removeEventListener('scroll', this.place, true);
        document.removeEventListener('keydown', this.onKey, true);
        this.root?.remove();
        this.root = null;
        this.region = null;
    }

    private readonly place = (): void => {
        if (!this.root || !this.region) return;
        const r = this.region.getBoundingClientRect();
        const rect = drawerRect(
            { left: r.left, top: r.top, width: r.width, height: r.height },
            { width: window.innerWidth, height: window.innerHeight },
        );
        if (!rect) {
            // The preview went away (another service, collapsed panel): so does the drawer.
            this.close();
            return;
        }
        Object.assign(this.root.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
        });
    };

    private readonly onKey = (e: KeyboardEvent): void => {
        if (e.key !== 'Escape' || !this.root) return;
        e.stopPropagation();
        this.close();
    };
}

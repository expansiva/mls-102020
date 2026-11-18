/// <mls fileReference="_102020_/l2/aura/studio/studioMoleculePreview.ts" enhancement="_blank" />
// Shows another molecule of the same group IN PLACE of the selected one, on screen only, while the
// pointer (or the keyboard focus) is on a variant in the "Moléculas" panel — so the user sees how
// the page looks with it before choosing. Clicking the variant is still the real swap
// (serviceGenome `_onMoleculesChanged`); this module never touches a source, a Monaco model, the
// defs history or the undo stack.
//
// HOW, AND WHY THIS WAY
// The original element is HIDDEN, not removed: Lit still owns it (its bindings, its parts), the
// in-place editor still holds it as the selection, and bringing it back has to be the same node with
// the same state. A stand-in of the new tag is inserted right after it, built from what the page gave
// the original: its attributes, its slot tags (the contract every molecule of a group shares) and the
// Lit properties both classes declare. The stand-in carries the editor's own chrome class, so the
// editor neither selects it nor counts it nor lists it in the page tree.
//
// The pure decisions (which elements, which attributes, which properties) are exported for tests;
// the DOM work stays in `MoleculePreview`.

/** The class the in-place editor uses for its own chrome: excluded from selection, counts and tree. */
const EDITOR_CHROME_CLASS = 'se-control';
/** Marks a stand-in, and lets the page's own CSS (or a test) tell it apart. */
const STAND_IN_ATTR = 'data-molecule-preview';
/** How long to wait for a molecule module to define its element before giving up. */
const DEFINE_TIMEOUT_MS = 4000;

// ─── Pure decisions ──────────────────────────────────────────────────

/**
 * Which of the elements carrying the selected tag get a stand-in: all of them, or the one at the
 * selection's position on screen. `occurrence` is the same document-order index the editor publishes
 * (`countTagInDom`); -1 or out of range means it cannot be told, and nothing is previewed — guessing
 * would show the variant somewhere the click would not put it.
 */
export function pickPreviewTargets<T>(matches: readonly T[], occurrence: number, all: boolean): T[] {
    if (all) return [...matches];
    if (occurrence < 0 || occurrence >= matches.length) return [];
    return [matches[occurrence]];
}

/**
 * The attributes a stand-in copies from the original. `id` would be duplicated on the page (the
 * original stays, hidden); `style` may carry our own `display: none`; and the editor's marks
 * (`data-se-*`) belong to the node it marked.
 */
export function standInAttributes(attrs: readonly { name: string; value: string }[]): { name: string; value: string }[] {
    return attrs.filter((a) => {
        const name = a.name.toLowerCase();
        return name !== 'id' && name !== 'style' && !name.startsWith('data-se-') && name !== STAND_IN_ATTR;
    });
}

/** A Lit property declaration as far as this module cares: internal `@state()` is not the page's. */
export interface IDeclaredProperty {
    state?: boolean;
}

/**
 * The Lit properties to carry from the original to the stand-in: the ones BOTH classes declare as
 * public properties. Attributes already travel with `standInAttributes`; these are what the page
 * bound with `.prop=${…}`, which leaves no attribute behind (the value, `isEditing`, data lists).
 */
export function sharedProperties(
    from: ReadonlyMap<PropertyKey, IDeclaredProperty> | undefined,
    to: ReadonlyMap<PropertyKey, IDeclaredProperty> | undefined,
): string[] {
    if (!from || !to) return [];
    const out: string[] = [];
    for (const [key, decl] of from) {
        if (typeof key !== 'string' || decl?.state) continue;
        const target = to.get(key);
        if (!target || target.state) continue;
        out.push(key);
    }
    return out;
}

/** The module URL of a molecule file, the same path the page's own import uses. */
export function moleculeModuleUrl(file: { project: number; folder: string; shortName: string }): string {
    const folder = file.folder.replace(/^\/+|\/+$/g, '');
    return `/_${file.project}_/l2/${folder ? `${folder}/` : ''}${file.shortName}.js`;
}

// ─── DOM work ────────────────────────────────────────────────────────

export interface IMoleculePreviewRequest {
    /** The region the page renders into (the editor's host). */
    host: HTMLElement;
    /** Tag of the selected molecule. */
    fromTag: string;
    /** The selection's position among the elements with `fromTag`, as the editor published it. */
    occurrence: number;
    /** "Apply to all occurrences" is on: preview every element with `fromTag`. */
    all: boolean;
    /** Tag to show instead. */
    toTag: string;
    /** Module that defines `toTag`. */
    moduleUrl: string;
}

export type MoleculePreviewResult = 'shown' | 'cleared' | 'stale' | 'unavailable';

interface IPreviewEntry {
    original: HTMLElement;
    standIn: HTMLElement;
    /** The original's inline `display` before we hid it, with its priority, to put back exactly. */
    display: string;
    priority: string;
}

export class MoleculePreview {
    private entries: IPreviewEntry[] = [];
    /** Bumped by every show/clear: an older show that finishes loading late must not apply. */
    private token = 0;

    get active(): boolean {
        return this.entries.length > 0;
    }

    /**
     * Shows `toTag` in place of the selected element(s). Replaces any preview already on screen.
     * Resolves 'unavailable' when nothing could be shown (element not on screen, module failed to
     * load or define the tag, the stand-in threw), and 'stale' when a newer call superseded it.
     */
    async show(req: IMoleculePreviewRequest): Promise<MoleculePreviewResult> {
        const token = ++this.token;
        const from = req.fromTag.toLowerCase();
        const to = req.toTag.toLowerCase();
        if (!from || !to || from === to) {
            this.restore();
            return 'cleared';
        }

        const defined = await this.ensureDefined(to, req.moduleUrl);
        if (token !== this.token) return 'stale';
        this.restore();
        if (!defined) return 'unavailable';

        const matches = Array.from(req.host.querySelectorAll<HTMLElement>(from))
            .filter((el) => !el.closest(`.${EDITOR_CHROME_CLASS}`));
        const targets = pickPreviewTargets(matches, req.occurrence, req.all);
        if (targets.length === 0) return 'unavailable';

        try {
            for (const original of targets) this.entries.push(this.swapIn(original, to));
        } catch (error) {
            console.warn(`[moleculePreview] could not show <${to}> in place of <${from}>`, error);
            this.restore();
            return 'unavailable';
        }
        return 'shown';
    }

    /** Puts the page back exactly as it was. Safe to call at any time, any number of times. */
    clear(): void {
        this.token++;
        this.restore();
    }

    private restore(): void {
        const entries = this.entries;
        this.entries = [];
        for (const entry of entries) {
            entry.standIn.remove();
            // A remount may have taken the original away meanwhile; there is nothing to put back then.
            if (!entry.original.isConnected) continue;
            if (entry.display) entry.original.style.setProperty('display', entry.display, entry.priority);
            else entry.original.style.removeProperty('display');
            if (!entry.original.getAttribute('style')) entry.original.removeAttribute('style');
        }
    }

    private swapIn(original: HTMLElement, toTag: string): IPreviewEntry {
        const standIn = document.createElement(toTag);
        for (const attr of standInAttributes(Array.from(original.attributes))) {
            standIn.setAttribute(attr.name, attr.value);
        }
        standIn.classList.add(EDITOR_CHROME_CLASS);
        standIn.setAttribute(STAND_IN_ATTR, '');

        for (const slot of this.slotTagsOf(original)) standIn.appendChild(slot);
        this.copyProperties(original, standIn);

        const display = original.style.getPropertyValue('display');
        const priority = original.style.getPropertyPriority('display');
        original.after(standIn);
        original.style.setProperty('display', 'none', 'important');
        return { original, standIn, display, priority };
    }

    /**
     * Copies of the original's slot tags, visible again (the molecule base hides them on connect).
     *
     * A LIVE-slot molecule MOVES content out of its sources into its own markup — a whole slot tag
     * (`renderLiveSlot`) or one element of it, a table cell or a list item (`renderLiveSlotFrom`) —
     * and leaves each drained source empty and marked `data-ml-live-source="<key>"`. A plain clone
     * would carry the rows with no text in their cells, so every drained source in the clone gets
     * copies of the content the original is showing for that key. Clones, never the nodes: the
     * original keeps its own and gets them back untouched.
     */
    private slotTagsOf(original: HTMLElement): HTMLElement[] {
        const slotTags = ((original as any).slotTags as string[] | undefined ?? []).map((t) => t.toUpperCase());
        if (slotTags.length === 0) return [];
        const out: HTMLElement[] = [];
        for (const child of Array.from(original.children)) {
            if (!slotTags.includes(child.tagName)) continue;
            const clone = child.cloneNode(true) as HTMLElement;
            clone.style.removeProperty('display');
            if (!clone.getAttribute('style')) clone.removeAttribute('style');
            this.refillDrainedSources(original, clone);
            out.push(clone);
        }
        return out;
    }

    /** Puts back, in `clone`, copies of the content the original moved out of each live source. */
    private refillDrainedSources(original: HTMLElement, clone: HTMLElement): void {
        const drained = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('[data-ml-live-source]'))]
            .filter((el) => el.dataset.mlLiveSource);
        for (const source of drained) {
            const key = source.dataset.mlLiveSource!;
            delete source.dataset.mlLiveSource;
            if (source !== clone) {
                source.style.removeProperty('display');
                if (!source.getAttribute('style')) source.removeAttribute('style');
            }
            if (source.hasChildNodes()) continue;
            for (const node of this.liveContentOf(original, key)) {
                if (node.nodeType === Node.COMMENT_NODE) continue;
                source.appendChild(node.cloneNode(true));
            }
        }
    }

    /**
     * The nodes the original currently shows for a live key. The molecule base keeps them by key
     * (`_currentNodes`, private to it but reachable at runtime), which also covers rows that are
     * off screen (another page of a paginated table). Without it, the anchor on screen holding that
     * key is the next best answer.
     */
    private liveContentOf(original: HTMLElement, key: string): Node[] {
        const reader = (original as any)._currentNodes;
        if (typeof reader === 'function') {
            try {
                const nodes = reader.call(original, key) as Node[] | undefined;
                if (nodes && nodes.length > 0) return nodes;
            } catch {
                // Fall through to the anchor.
            }
        }
        const anchor = Array.from(original.querySelectorAll<HTMLElement>('[data-ml-live-held]'))
            .find((a) => a.dataset.mlLiveHeld === key);
        return anchor ? Array.from(anchor.childNodes) : [];
    }

    private copyProperties(original: HTMLElement, standIn: HTMLElement): void {
        const fromProps = (original.constructor as any).elementProperties as Map<PropertyKey, IDeclaredProperty> | undefined;
        const toProps = (standIn.constructor as any).elementProperties as Map<PropertyKey, IDeclaredProperty> | undefined;
        for (const key of sharedProperties(fromProps, toProps)) {
            const value = (original as any)[key];
            if (value === undefined) continue;
            try {
                (standIn as any)[key] = value;
            } catch {
                // A read-only accessor on the target: the attribute copy is all it gets.
            }
        }
    }

    private async ensureDefined(tag: string, moduleUrl: string): Promise<boolean> {
        if (customElements.get(tag)) return true;
        try {
            await import(moduleUrl);
        } catch (error) {
            console.warn(`[moleculePreview] could not load ${moduleUrl}`, error);
            return false;
        }
        if (customElements.get(tag)) return true;
        const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), DEFINE_TIMEOUT_MS));
        return Promise.race([customElements.whenDefined(tag).then(() => true), timeout]);
    }
}

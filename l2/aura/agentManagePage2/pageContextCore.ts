/// <mls fileReference="_102020_/l2/aura/agentManagePage2/pageContextCore.ts" enhancement="_blank" />

// Pure context builder for agentManagePage2 (TASK-102020-agent-manage-page-2). No mls.* — the caller
// reads the files, this module turns them into the compact digest the scope gate reasons over.
//
// Why a digest at all: the page's own `.defs.ts` is a PROJECTION of l4 and carries no layout, so the
// question "does this project have that field / that routine?" is only answerable upstream. The
// authoritative artifact is `l4/<module>/workspaces/<page>.defs.ts` (sections + bffCalls with every
// input/output field and type). Everything here stays under a few KB: workspace-model.defs.ts alone
// is 271 KB and must never reach a prompt.

import {
    listMethods, catalogueKeys, findMessageConsts, hasPageCatalogue, parseExportJson, scanBalancedTs,
    type EditOperation2,
} from '/_102020_/l2/aura/agentManagePage2/patchCore.js';

// ─── shapes ─────────────────────────────────────────────────────────────────

export interface DataField { name: string; type: string; required: boolean; }
export interface DataInput { name: string; source: string; required: boolean; type: string; }
export interface DataCall {
    bffId: string;
    kind: 'query' | 'command';
    description?: string;
    inputs: DataInput[];
    output: { kind: string; fields: DataField[] };
}
export interface SectionDigest {
    sectionId: string;
    intent: string;
    organisms: Array<{ role: string; usage?: string; dataSource?: string; action?: string }>;
    method?: string;
}
export interface WorkspaceDigest {
    purpose: string;
    actors: string[];
    entity?: string;
    presentation?: string;
    sections: SectionDigest[];
    data: DataCall[];
    /** Where the digest came from — the gate is told, so it can be honest about what it cannot see. */
    source: 'l4-workspace' | 'page-defs';
}

export interface SharedSurface {
    /** Every public member the base class offers — what guardMembers validates against. */
    members: Set<string>;
    states: Array<{ name: string; kind: string; type: string }>;
    handlers: string[];
    msgKeys: Set<string>;
}

export interface MethodOutline {
    method: string;
    msgKeys: string[];
    members: string[];
    lines: number;
}

export interface UserChangeLike { id: string; change: string; scope: string; intent: string; user: string; date: string; }

export interface PageEditContext {
    page: string;
    module: string;
    purpose: string;
    actors: string[];
    entity?: string;
    presentation?: string;
    languages: string[];
    canAddText: boolean;
    contextSource: WorkspaceDigest['source'];
    sections: SectionDigest[];
    data: DataCall[];
    surface: { states: SharedSurface['states']; handlers: string[] };
    outline: MethodOutline[];
    pageMsgKeys: string[];
    userChanges: UserChangeLike[];
}

// ─── l4 workspace digest ────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function str(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

/** First `export const <name> = { … };` of a defs file, parsed as JSON. Null when not JSON-shaped. */
export function parseFirstExportObject(src: string): Record<string, unknown> | null {
    const m = /export\s+const\s+[A-Za-z0-9_$]+\s*=\s*\{/u.exec(src);
    if (!m) return null;
    const start = m.index + m[0].length - 1;
    const end = scanBalancedTs(src, start);
    if (end < 0) return null;
    try {
        const parsed = JSON.parse(src.slice(start, end));
        return isRecord(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function digestFields(raw: unknown): DataField[] {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.filter(isRecord).map(field => ({
        name: str(field.name),
        type: str(field.type, 'string'),
        required: field.required !== false,
    })).filter(field => !!field.name);
}

function digestInputs(raw: unknown): DataInput[] {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.filter(isRecord).map(input => ({
        name: str(input.name),
        source: str(input.source, 'userInput'),
        required: input.required !== false,
        type: str(input.type, 'string'),
    })).filter(input => !!input.name);
}

/**
 * Digest of `l4/<module>/workspaces/<page>.defs.ts`: sections/organisms plus every bff call with its
 * inputs and output fields. `from`, `route`, `uses` and `sliceHash` are dropped — they are wiring,
 * not something a visual decision depends on.
 */
export function digestWorkspace(l4Src: string): WorkspaceDigest | null {
    const workspace = parseFirstExportObject(l4Src);
    if (!workspace || !Array.isArray(workspace.bffCalls)) return null;

    const data: DataCall[] = (workspace.bffCalls as unknown[]).filter(isRecord).map((call): DataCall => {
        const output = isRecord(call.output) ? call.output : {};
        return {
            bffId: str(call.bffId),
            kind: str(call.kind) === 'command' ? 'command' : 'query',
            inputs: digestInputs(call.input),
            output: { kind: str(output.kind, 'object'), fields: digestFields(output.fields) },
        };
    }).filter(call => !!call.bffId);

    const sections: SectionDigest[] = (Array.isArray(workspace.sections) ? workspace.sections : [])
        .filter(isRecord)
        .map(section => ({
            sectionId: str(section.sectionId),
            intent: str(section.intent),
            organisms: (Array.isArray(section.organisms) ? section.organisms : []).filter(isRecord).map(organism => ({
                role: str(organism.role),
                usage: organism.usage ? str(organism.usage) : undefined,
                dataSource: organism.dataSource ? str(organism.dataSource) : undefined,
                action: organism.action ? str(organism.action) : undefined,
            })),
        }))
        .filter(section => !!section.sectionId);

    const presentation = isRecord(workspace.presentation) ? str(workspace.presentation.categoryRef) : '';
    return {
        purpose: str(workspace.purpose),
        actors: (Array.isArray(workspace.actors) ? workspace.actors : []).map(actor => str(actor)).filter(Boolean),
        entity: str(workspace.entity) || undefined,
        presentation: presentation || undefined,
        sections,
        data,
        source: 'l4-workspace',
    };
}

/**
 * Fallback for pages whose l4 workspace is not available (older aura/genome projects): the same
 * digest shape derived from the page defs' own `dataBindings`. Output fields are unknown there, which
 * is exactly why the l4 workspace is preferred.
 */
export function digestFromPageDefs(defsSrc: string): WorkspaceDigest | null {
    const definition = parseExportJson(defsSrc, 'definition');
    if (!isRecord(definition)) return null;
    const bindings = Array.isArray(definition.dataBindings) ? definition.dataBindings : [];
    const data: DataCall[] = bindings.filter(isRecord).map((binding): DataCall => ({
        bffId: str(binding.command) || str(binding.id),
        kind: str(binding.kind) === 'command' ? 'command' : 'query',
        description: str(binding.description) || undefined,
        inputs: digestInputs(binding.inputs),
        output: { kind: 'unknown', fields: [] },
    })).filter(call => !!call.bffId);

    const presentation = isRecord(definition.presentation) ? str(definition.presentation.categoryRef) : '';
    return {
        purpose: str(definition.purpose),
        actors: [str(definition.actor)].filter(Boolean),
        presentation: presentation || undefined,
        sections: [],
        data,
        source: 'page-defs',
    };
}

// ─── shared runtime surface (compiled .d.ts, raw .ts as fallback) ────────────

const STATE_DOC = /\/\*\*\s*state\s+(\S+)\s*[—-]\s*([^*]+?)\*\/\s*(?:\r?\n)\s*(?:@property\(\)\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\s*[?!]?\s*:\s*([^;=]+)/gu;

/**
 * Public surface of the shared base class. Works on the compiled `.d.ts` (preferred — it is the
 * authoritative, compact contract) and on the raw `.ts` (the fallback the materializer also allows).
 * `private` members are deliberately excluded: the page may not touch them.
 */
export function parseSharedSurface(source: string): SharedSurface {
    const members = new Set<string>();
    const handlers: string[] = [];
    const states: SharedSurface['states'] = [];
    const msgKeys = new Set<string>();

    for (let m = STATE_DOC.exec(source); m; m = STATE_DOC.exec(source)) {
        states.push({ name: m[3], kind: m[1] ? m[2].trim() : m[2].trim(), type: m[4].trim() });
    }
    STATE_DOC.lastIndex = 0;

    // Properties: `name: type;` / `@property() name: type = …;`
    const prop = /(?:^|\n)[ \t]+(?:(?:public|readonly|declare)\s+)*(?:@property\(\)\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\s*[?!]?\s*:\s*[^;\n]+/gu;
    for (let m = prop.exec(source); m; m = prop.exec(source)) members.add(m[1]);

    // Methods: `name(args): ret;` / `name(args) {`
    const method = /(?:^|\n)[ \t]+(?:(?:public|static|override|async)\s+)*([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*[:{]/gu;
    for (let m = method.exec(source); m; m = method.exec(source)) {
        members.add(m[1]);
        if (/^handle[A-Z]/u.test(m[1])) handlers.push(m[1]);
    }

    // `private x;` declarations must NOT become allowed members.
    const priv = /(?:^|\n)[ \t]+private\s+([A-Za-z_$][A-Za-z0-9_$]*)/gu;
    for (let m = priv.exec(source); m; m = priv.exec(source)) members.delete(m[1]);

    // Shared message keys: the quoted keys of the catalogue type/const.
    const key = /'([^']+)'\s*:\s*string[;,]/gu;
    for (let m = key.exec(source); m; m = key.exec(source)) msgKeys.add(m[1]);
    const literalKey = /'([^']+)'\s*:\s*'/gu;
    for (let m = literalKey.exec(source); m; m = literalKey.exec(source)) msgKeys.add(m[1]);

    return { members, states, handlers: [...new Set(handlers)].sort(), msgKeys };
}

// ─── the current page file ──────────────────────────────────────────────────

/** What each render method of the page currently references — the gate's map of the screen. */
export function outlinePage(pageSrc: string): MethodOutline[] {
    return listMethods(pageSrc)
        .filter(span => span.name !== 'msg')
        .map(span => {
            const body = pageSrc.slice(span.start, span.end);
            const msgKeys = new Set<string>();
            const members = new Set<string>();
            const keyRe = /\bmsg\[\s*'([^']+)'\s*\]/gu;
            for (let m = keyRe.exec(body); m; m = keyRe.exec(body)) msgKeys.add(m[1]);
            const memberRe = /\bthis\.([A-Za-z0-9_$]+)/gu;
            for (let m = memberRe.exec(body); m; m = memberRe.exec(body)) members.add(m[1]);
            return { method: span.name, msgKeys: [...msgKeys], members: [...members], lines: body.split('\n').length };
        });
}

/** Locales the page file itself declares — the authority, not the l4 language list. */
export function pageLocales(pageSrc: string): string[] {
    return findMessageConsts(pageSrc).map(konst => konst.locale);
}

/** Design-system CSS variable names (`--page-bg`) from the project's designSystem.ts. */
export function dsTokenNames(designSystemSrc: string): Set<string> {
    const out = new Set<string>();
    const re = /"([a-z][a-z0-9-]*)"\s*:\s*"/gu;
    for (let m = re.exec(designSystemSrc); m; m = re.exec(designSystemSrc)) {
        if (m[1] === 'themename' || m[1] === 'description') continue;
        out.add(`--${m[1]}`);
    }
    return out;
}

// ─── section ⇄ render method ────────────────────────────────────────────────

function normalizeName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/gu, '');
}

/**
 * Hint the gate with the render method that most likely draws each l4 section: first by name
 * (section `locateChangeOrder` ⇒ `renderLocateChangeOrder`), then positionally for the leftovers
 * (the generator emits one render method per section, in order). A hint, never a guard — the guard is
 * `guardScope`, which only accepts methods that actually exist.
 */
export function mapSectionsToMethods(sections: SectionDigest[], outline: MethodOutline[]): SectionDigest[] {
    const renderMethods = outline.map(item => item.method).filter(name => name !== 'render');
    const taken = new Set<string>();
    const out = sections.map(section => ({ ...section }));

    for (const section of out) {
        const candidates = [section.sectionId, ...section.organisms.map(o => o.dataSource ?? o.action ?? '')]
            .filter(Boolean)
            .map(value => normalizeName(value.replace(/^(?:qry|cmd)/u, '')));
        const hit = renderMethods.find(name => !taken.has(name) && candidates.some(candidate => candidate && normalizeName(name).includes(candidate)));
        if (hit) { section.method = hit; taken.add(hit); }
    }

    const free = renderMethods.filter(name => !taken.has(name));
    let cursor = 0;
    for (const section of out) {
        if (section.method || cursor >= free.length) continue;
        section.method = free[cursor++];
    }
    return out;
}

// ─── assembly ───────────────────────────────────────────────────────────────

export interface ContextSources {
    page: string;
    module: string;
    /** `l4/<module>/workspaces/<page>.defs.ts`, when present. */
    l4WorkspaceSrc?: string | null;
    /** the page's own `.defs.ts` — the fallback digest and the userChanges holder. */
    defsSrc: string;
    /** the page's current `.ts`. */
    pageSrc: string;
    /** the shared base class: compiled `.d.ts` preferred, raw `.ts` accepted. */
    sharedSrc: string;
    userChanges: UserChangeLike[];
    languages?: string[];
}

/** Everything the gate sees, and nothing else. */
export function buildPageEditContext(sources: ContextSources): PageEditContext {
    const digest = (sources.l4WorkspaceSrc ? digestWorkspace(sources.l4WorkspaceSrc) : null)
        ?? digestFromPageDefs(sources.defsSrc)
        ?? { purpose: '', actors: [], sections: [], data: [], source: 'page-defs' as const };

    const surface = parseSharedSurface(sources.sharedSrc);
    const outline = outlinePage(sources.pageSrc);
    const locales = pageLocales(sources.pageSrc);

    return {
        page: sources.page,
        module: sources.module,
        purpose: digest.purpose,
        actors: digest.actors,
        entity: digest.entity,
        presentation: digest.presentation,
        languages: locales.length ? locales : (sources.languages ?? []),
        canAddText: hasPageCatalogue(sources.pageSrc),
        contextSource: digest.source,
        sections: mapSectionsToMethods(digest.sections, outline),
        data: digest.data,
        surface: { states: surface.states, handlers: surface.handlers },
        outline,
        pageMsgKeys: [...catalogueKeys(sources.pageSrc)],
        userChanges: sources.userChanges,
    };
}

/** Method names the gate is allowed to use as `scope`. */
export function scopeVocabulary(context: PageEditContext): string[] {
    return ['page', ...context.outline.map(item => item.method)];
}

/** Drop operations whose `scope` is not a method of this page (a split page's target may be elsewhere). */
export function partitionOperationsByScope(operations: EditOperation2[], context: PageEditContext): { valid: EditOperation2[]; unknown: EditOperation2[] } {
    const vocabulary = new Set(scopeVocabulary(context));
    const valid: EditOperation2[] = [];
    const unknown: EditOperation2[] = [];
    for (const operation of operations) {
        (vocabulary.has(operation.scope) ? valid : unknown).push(operation);
    }
    return { valid, unknown };
}

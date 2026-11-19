/// <mls fileReference="_102020_/l2/aura/helpers/l2ContractRoutes.ts" enhancement="_blank"/>

// The L2 → L1 contract check: every route a page contract declares, whether the page's shared calls
// it, and whether a backend controller handles it. Pure: the caller reads the files.
//
// Lived inside serviceL2Validator while it was the only one asking. The modules dashboard asks the
// same question per module, and a second reading of the contracts would drift from the first — so
// both call this.

/** A file as this check needs it: where it is and what it holds. */
export interface ContractSource {
    project: number;
    /** Project-relative folder (`<module>/web/contracts`). */
    folder: string;
    shortName: string;
    extension: string;
    content: string;
}

export interface RouteRow {
    key: string;
    page: string;
    routeName: string;
    route: string;
    contractPath: string;
    sharedPath: string | null;
    /** The controller `.ts` (serviceSourceL1 only opens the .ts of a file), relative to l1. */
    backendPath: string | null;
    backendProject: number | null;
    calledInFrontend: boolean;
    existsInBackend: boolean;
    hasIssue: boolean;
}

/** First `export const … = {…} as const;` artifact block — same idiom the codegen agents use
 *  (e.g. agentCbHttpController.ts). Unwraps to the artifact's `data`. */
export function parseArtifactData(content: string): Record<string, unknown> | undefined {
    const s = content.indexOf('= ');
    const e = content.indexOf(' as const');
    if (s === -1 || e <= s) return undefined;
    try {
        const parsed = JSON.parse(content.slice(s + 2, e));
        if (!parsed || typeof parsed !== 'object') return undefined;
        const data = (parsed as { data?: unknown }).data;
        return data && typeof data === 'object' ? data as Record<string, unknown> : parsed as Record<string, unknown>;
    } catch {
        return undefined;
    }
}

/** The routes a page contract declares: the quoted keys of its `export interface <X>Contracts { … }`
 *  (`'agendaClinica.pacientes.loadPatients': { input…; output… }`). Only the keys at the first
 *  level of that interface — the nested input/output shapes are not routes. */
export function contractRoutes(content: string): string[] {
    const head = /export interface \w*Contracts\s*\{/.exec(content);
    if (!head) return [];
    const routes: string[] = [];
    let depth = 1;
    let lineStart = true;
    for (let i = head.index + head[0].length; i < content.length && depth > 0; i++) {
        const ch = content[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (depth === 1 && lineStart && (ch === "'" || ch === '"')) {
            const key = new RegExp(`^${ch}([\\w.]+)${ch}\\s*\\??:`).exec(content.slice(i));
            if (key) routes.push(key[1]);
        }
        if (ch === '\n') lineStart = true;
        else if (ch !== ' ' && ch !== '\t') lineStart = false;
    }
    return routes;
}

/** The shared passes the route as an ARGUMENT — right after `(` or `,` — and uses execBff. That
 *  covers the three shapes the generator writes: `execBff<Output<'r'>>('r', …)`, a generic
 *  wrapper `this.query('r', …)` that hands it to `execBff(request, …)`, and helpers like
 *  `runCommand('id', 'r', …)`. In type positions (`Output<'r'>`, `| 'r'`) it follows `<` or `|`. */
export function callsRoute(sharedContent: string, route: string): boolean {
    if (!/\bexecBff\b/.test(sharedContent)) return false;
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`[(,]\\s*['"\`]${escaped}['"\`]`).test(sharedContent);
}

const pathOf = (file: ContractSource): string => `${file.folder}/${file.shortName}${file.extension}`;

/**
 * Every route declared in every contract, not just the broken ones, sorted by page and route.
 *
 * @param contracts the `.defs.ts` of `<module>/web/contracts`
 * @param shared the `.ts` of `<module>/web/shared`, matched to a contract by shortName
 * @param controllerDefs the `.defs.ts` of the L1 controllers, whose `handlers[].route` are the backend routes
 */
export function checkContractRoutes(contracts: ContractSource[], shared: ContractSource[], controllerDefs: ContractSource[]): RouteRow[] {
    const backendRoutes = new Map<string, { path: string; project: number }>();
    for (const file of controllerDefs) {
        const data = parseArtifactData(file.content);
        const handlers = Array.isArray((data as { handlers?: unknown } | undefined)?.handlers)
            ? (data as { handlers: Array<Record<string, unknown>> }).handlers
            : [];
        for (const handler of handlers) {
            // The route is declared in the controller's .defs.ts, but the link opens the controller
            // itself: serviceSourceL1 only opens the .ts of a file.
            if (typeof handler.route === 'string') backendRoutes.set(handler.route, { path: `${file.folder}/${file.shortName}.ts`, project: file.project });
        }
    }

    const sharedByShortName = new Map(shared.map((file) => [file.shortName, file]));
    const rows: RouteRow[] = [];
    for (const contract of contracts) {
        const sharedFile = sharedByShortName.get(contract.shortName);
        for (const route of contractRoutes(contract.content)) {
            const routeName = route.split('.').pop() || route;
            const calledInFrontend = sharedFile ? callsRoute(sharedFile.content, route) : false;
            const backendInfo = backendRoutes.get(route);
            const existsInBackend = Boolean(backendInfo);
            rows.push({
                key: `${contract.shortName}:${routeName}`,
                page: contract.shortName,
                routeName,
                route,
                contractPath: pathOf(contract),
                sharedPath: sharedFile ? pathOf(sharedFile) : null,
                backendPath: backendInfo?.path ?? null,
                backendProject: backendInfo?.project ?? null,
                calledInFrontend,
                existsInBackend,
                hasIssue: !calledInFrontend || !existsInBackend,
            });
        }
    }
    rows.sort((a, b) => a.page.localeCompare(b.page) || a.routeName.localeCompare(b.routeName));
    return rows;
}

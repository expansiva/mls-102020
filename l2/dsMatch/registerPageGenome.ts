/// <mls fileReference="_102020_/l2/dsMatch/registerPageGenome.ts" enhancement="_blank" />

// Terminal step of a DS derivation: register the new page variation in the module's
// `module.ts` moduleGenome. Module-level + ONCE + deterministic (no LLM). Triggered
// by the DerivationTracker when all pages finished (Fase 2 / agentGenDefs).
//
// The page folder uses indices (page{layout}{ds}); the genome VALUE uses NAMES
// (designSystems[ds].name, layouts[layout].name) read from project.json.
//
// We do NOT use defsAST here: the moduleGenome literal is loose TS (single quotes,
// unquoted keys, `: Record<...>`, `as const`) that defeats JSON-based helpers — that
// caused a DUPLICATED `export const moduleGenome` block. Instead we MERGE the entry
// into the existing object literal via text surgery (upsertModuleGenome), preserving
// the existing entries, the type annotation and `as const`.

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import { DEFAULT_DEVICE } from '/_102020_/l2/dsMatch/derivePaths.js';

export interface GenomeEntry {
    key: string;                       // 'web/desktop/page12'
    value: { designSystem: string; device: string; layout: string };
}

/** Pure: build the moduleGenome entry for a variation. */
export function buildGenomeEntry(
    layout: number | string,
    ds: number | string,
    dsName: string,
    layoutName: string,
    device = DEFAULT_DEVICE,
): GenomeEntry {
    return {
        key: `web/${device}/page${layout}${ds}`,
        value: { designSystem: dsName, device, layout: layoutName },
    };
}

/**
 * Pure: upsert one entry into an existing `export const moduleGenome = { ... }`
 * object literal, preserving everything else. Returns null if no moduleGenome
 * declaration is found (caller decides to create one).
 */
export function upsertModuleGenome(src: string, key: string, value: object): string | null {
    const loc = locateGenomeObject(src);
    if (!loc) return null;

    const before = src.slice(0, loc.open + 1); // ends with '{'
    const inner = src.slice(loc.open + 1, loc.close);
    const after = src.slice(loc.close);        // starts with '}'

    const valueText = indentBlock(JSON.stringify(value, null, 2), '  ');

    if (keyExists(inner, key)) {
        const replaced = replaceEntryValue(inner, key, valueText);
        if (replaced == null) return null;
        return before + replaced + after;
    }

    const entry = `  ${JSON.stringify(key)}: ${valueText}`;
    const innerTrimEnd = inner.replace(/\s+$/, '');
    const sep = innerTrimEnd.length === 0 ? '' : (innerTrimEnd.endsWith(',') ? '' : ',');
    const newInner = `${innerTrimEnd}${sep}\n${entry}\n`;
    return before + newInner + after;
}

/**
 * Read/ensure the moduleGenome entry for page{layout}{ds} in {module}/module.ts.
 * Idempotent. Creates module.ts from a template if it does not exist; appends a
 * moduleGenome export if the file exists without one.
 */
export async function registerPageGenome(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    device = DEFAULT_DEVICE,
): Promise<GenomeEntry> {

    const config: any = await getConfigProject(project);
    const dsName = config?.designSystems?.[String(ds)]?.name ?? String(ds);
    const layoutName = config?.layouts?.[String(layout)]?.name ?? String(layout);

    const entry = buildGenomeEntry(layout, ds, dsName, layoutName, device);
    const moduleRef = `_${project}_/l2/${module}/module.ts`;
    const existingSrc = await readSource(moduleRef);

    let newSrc: string;
    if (!existingSrc) {
        newSrc = moduleTemplate(moduleRef, { [entry.key]: entry.value });
    } else {
        const merged = upsertModuleGenome(existingSrc, entry.key, entry.value);
        // File exists but has no moduleGenome → append a declaration (don't clobber).
        newSrc = merged ?? `${existingSrc.replace(/\s*$/, '')}\n\nexport const moduleGenome: Record<string, IGenomeConfig> = ${JSON.stringify({ [entry.key]: entry.value }, null, 2)} as const;\n`;
    }

    await saveFile(moduleRef, newSrc);
    console.info(`[registerPageGenome] registered ${entry.key} → ${JSON.stringify(entry.value)} in ${moduleRef}`);
    return entry;
}

// ─── pure text helpers ──────────────────────────────────────────────────────

function locateGenomeObject(src: string): { open: number; close: number } | null {
    const m = src.match(/export\s+const\s+moduleGenome\b[^=]*=\s*/);
    if (!m || m.index == null) return null;
    const open = src.indexOf('{', m.index + m[0].length);
    if (open < 0) return null;
    const close = findMatchingBrace(src, open);
    if (close < 0) return null;
    return { open, close };
}

/** Index of the '}' matching the '{' at `open`, skipping string literals. */
function findMatchingBrace(s: string, open: number): number {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
        const c = s[i];
        if (c === '"' || c === "'" || c === '`') { i = skipString(s, i, c); continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

function skipString(s: string, i: number, quote: string): number {
    for (let j = i + 1; j < s.length; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (s[j] === quote) return j;
    }
    return s.length;
}

function keyExists(inner: string, key: string): boolean {
    return new RegExp(`(['"\`]?)${escapeRegex(key)}\\1\\s*:`).test(inner);
}

function replaceEntryValue(inner: string, key: string, valueText: string): string | null {
    const m = new RegExp(`(['"\`]?)${escapeRegex(key)}\\1\\s*:\\s*`).exec(inner);
    if (!m || m.index == null) return null;
    const valStart = inner.indexOf('{', m.index + m[0].length);
    if (valStart < 0) return null;
    const valEnd = findMatchingBrace(inner, valStart);
    if (valEnd < 0) return null;
    return inner.slice(0, valStart) + valueText + inner.slice(valEnd + 1);
}

/** Indent every line except the first by `pad` (to nest a JSON object under a key). */
function indentBlock(json: string, pad: string): string {
    return json.split('\n').map((l, i) => (i === 0 ? l : pad + l)).join('\n');
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function moduleTemplate(moduleRef: string, genome: Record<string, any>): string {
    const cleanRef = moduleRef.startsWith('/') ? moduleRef.slice(1) : moduleRef;
    return [
        `/// <mls fileReference="${cleanRef}" enhancement="_blank" />`,
        '',
        `import type { AuraModuleFrontendDefinition, IPaths, ISkill, IGenomeConfig } from '/_102029_/l2/contracts/bootstrap.js';`,
        '',
        `export const moduleGenome: Record<string, IGenomeConfig> = ${JSON.stringify(genome, null, 2)} as const;`,
        '',
    ].join('\n');
}

// ─── runtime IO ───────────────────────────────────────────────────────────

async function readSource(ref: string): Promise<string> {
    const norm = ref.startsWith('/') ? ref.slice(1) : ref;
    const info = mls.stor.convertFileReferenceToFile(norm);
    const key = mls.stor.getKeyToFile(info);
    const sf = mls.stor.files[key];
    if (!sf) return '';
    const content = await sf.getContent();
    return typeof content === 'string' ? content : '';
}

async function saveFile(ref: string, src: string): Promise<void> {
    const info = mls.stor.convertFileReferenceToFile(ref);
    const key = mls.stor.getKeyToFile(info);
    let sf = mls.stor.files[key];
    if (!sf) {
        const param: IReqCreateStorFile = { ...info, source: src };
        sf = await createStorFile(param, true, true, true);
    } else {
        const m = await sf.getOrCreateModel();
        if (m && m.model) m.model.setValue(src);
    }
    await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}

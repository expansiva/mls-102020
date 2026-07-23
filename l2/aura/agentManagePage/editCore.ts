/// <mls fileReference="_102020_/l2/aura/agentManagePage/editCore.ts" enhancement="_blank" />

// Pure core for the page-edit flow (TASK-102020-agent-manage-page). No mls.* — testable directly.
//
// The gate (agentManagePage root) classifies the user request into typed operations OR rejects it.
// agentEditDefs then asks the LLM for the edited `definition` and validates it here before writing.
// The guards are schema-agnostic: they preserve page IDENTITY and, for genome-shaped defs (with
// `definition.layout`), keep the layout schema parseable. Mode pages (brief/uiSpec, no layout) pass
// the identity guard and skip the layout guard.

import { listLayoutElements } from '/_102020_/l2/aura/helpers/dsMatch/layoutElements.js';
import { nextAdjustmentId, type PageAdjustment, type PageAdjustmentKind } from '/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js';

export type EditKind = 'structural' | 'cosmetic';

/** One planned edit operation (gate output). */
export interface EditOperation {
    kind: EditKind;
    target: string;        // element id / region hint ('' when not element-specific)
    description: string;   // what to do, in the user's intent
}

/** Args carried in the edit-defs step's prompt (serialized by the orchestrator). */
export interface EditStepArgs {
    module: string;
    page: string;
    layout: number | string;
    ds: number | string;
    device: string;
    request: string;
    imageUrl?: string;
    operations: EditOperation[];
}

export type Guard<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Fields that identify the page — an edit must NEVER change them. */
export const IDENTITY_KEYS = ['pageId', 'moduleName', 'genome', 'baseClassName', 'routePattern'] as const;

export function isRecord(x: unknown): x is Record<string, unknown> {
    return !!x && typeof x === 'object' && !Array.isArray(x);
}

/** True when the definition carries a genome layout tree (definition.layout.sections). */
export function hasGenomeLayout(def: unknown): boolean {
    const layout = isRecord(def) ? (def as any).layout : undefined;
    return !!layout && typeof layout === 'object' && Array.isArray((layout as any).sections);
}

/** The set of molecule-eligible element ids in a (genome) definition. Empty for mode defs. */
export function layoutElementIdSet(def: unknown): Set<string> {
    const layout = isRecord(def) ? (def as any).layout : undefined;
    if (!layout) return new Set();
    return new Set(listLayoutElements(layout).map(e => e.id));
}

/** Added/removed element ids between two genome definitions (for logging + soft checks). */
export function idDelta(originalDef: unknown, editedDef: unknown): { added: string[]; removed: string[] } {
    const before = layoutElementIdSet(originalDef);
    const after = layoutElementIdSet(editedDef);
    const added = [...after].filter(id => !before.has(id));
    const removed = [...before].filter(id => !after.has(id));
    return { added, removed };
}

/**
 * Validate the LLM-edited `definition` against the original:
 *   - must be an object;
 *   - identity fields present in the original must be byte-identical in the edited one;
 *   - if the original was genome-shaped, the edited one must remain genome-shaped and still parse
 *     to ≥1 layout element (schema not broken).
 * Returns the edited definition on success, or a human reason on failure.
 */
export function validateEditedDefinition(original: unknown, edited: unknown): Guard<Record<string, unknown>> {
    if (!isRecord(original)) return { ok: false, reason: 'original definition is not an object' };
    if (!isRecord(edited)) return { ok: false, reason: 'edited definition is not an object' };

    for (const k of IDENTITY_KEYS) {
        if (k in original && JSON.stringify(original[k]) !== JSON.stringify((edited as any)[k])) {
            return { ok: false, reason: `identity field '${k}' must not change (was ${JSON.stringify(original[k])})` };
        }
    }

    if (hasGenomeLayout(original)) {
        if (!hasGenomeLayout(edited)) return { ok: false, reason: 'definition.layout structure was dropped' };
        if (layoutElementIdSet(edited).size === 0) return { ok: false, reason: 'edited layout has no elements (schema broke)' };
    }

    return { ok: true, value: edited };
}

/**
 * Delta-mode prompt section for the render step: the page's CURRENT generated code + the recorded
 * adjustments, with a minimal-change instruction. Pure. Returns '' when there is nothing to
 * preserve (no current code AND no adjustments) — caller then omits the section.
 */
export function buildDeltaSection(
    currentCode: string | null | undefined,
    adjustments: Array<{ request: string; kind?: string; notes?: string; imageUrl?: string }>,
): string {
    const hasCode = !!currentCode && currentCode.trim().length > 0;
    if (!hasCode && (!adjustments || adjustments.length === 0)) return '';
    const parts: string[] = ['## Edit mode — minimal change'];
    if (adjustments?.length) {
        parts.push(
            '',
            'Apply ONLY these visual adjustments; keep everything else in the current code structurally identical:',
            ...adjustments.map(a => {
                const tail = [a.notes ? `— ${a.notes}` : '', a.imageUrl ? `(reference image: ${a.imageUrl})` : ''].filter(Boolean).join(' ');
                return `- (${a.kind ?? 'edit'}) ${a.request}${tail ? ` ${tail}` : ''}`;
            }),
        );
    }
    if (hasCode) {
        parts.push('', '### Current code (preserve verbatim except for the adjustments above)', '```ts', currentCode!.trim(), '```');
    }
    return parts.join('\n');
}

// ─── pageAdjustments consolidation (Opção C) ─────────────────────────────────
// The edit LLM returns the CONSOLIDATED list of adjustments (existing + the new request, with
// contradictory prior ones superseded — newer wins on the same element/aspect). We reattach the
// audit fields DETERMINISTICALLY here: a surviving item keeps its original id + `at`; a new item
// (no matching id) is minted a fresh id + `at=now`. The LLM can never rename/forge an id — an
// unknown id is treated as new — so the id space stays honest (guard, à la validateEditedDefinition).

/** One consolidated adjustment as returned by the LLM (before audit fields are reattached). */
export interface ConsolidatedAdjustmentIn {
    id?: string;                 // present + known → a surviving prior adjustment (keep its id/at)
    request: string;
    kind: EditKind;
    notes?: string;
    imageUrl?: string;
}

/** Keep only well-formed items (non-empty request, valid kind); coerce id/notes/imageUrl. */
export function normalizeConsolidatedAdjustments(raw: unknown): ConsolidatedAdjustmentIn[] {
    const arr = Array.isArray(raw) ? raw : [];
    const out: ConsolidatedAdjustmentIn[] = [];
    for (const o of arr) {
        const request = typeof (o as any)?.request === 'string' ? (o as any).request.trim() : '';
        const kind = (o as any)?.kind;
        if (!request || (kind !== 'structural' && kind !== 'cosmetic')) continue;
        const id = typeof (o as any)?.id === 'string' && (o as any).id.trim() ? (o as any).id.trim() : undefined;
        const notes = typeof (o as any)?.notes === 'string' && (o as any).notes.trim() ? (o as any).notes.trim() : undefined;
        const imageUrl = typeof (o as any)?.imageUrl === 'string' && (o as any).imageUrl.trim() ? (o as any).imageUrl.trim() : undefined;
        out.push({ id, request, kind, notes, imageUrl });
    }
    return out;
}

/**
 * Reconcile the LLM's consolidated list against the existing adjustments into the final
 * PageAdjustment[] to persist. Pure (takes `nowIso` — no Date.now inside):
 *   - id matches an existing adjustment → reuse its id + `at` (audit continuity), take the
 *     consolidated request/kind, and its notes/imageUrl (falling back to the prior values);
 *   - no id, or an id NOT in `existing` → mint the next id + `at=nowIso` (unknown ids never trusted);
 *   - superseded prior adjustments simply don't appear in `consolidated`, so they drop out.
 */
export function reconcileAdjustments(
    existing: PageAdjustment[],
    consolidated: ConsolidatedAdjustmentIn[],
    nowIso: string,
): PageAdjustment[] {
    const byId = new Map(existing.map(a => [a.id, a]));
    const out: PageAdjustment[] = [];
    for (const item of consolidated) {
        const kind: PageAdjustmentKind = item.kind === 'structural' ? 'structural' : 'cosmetic';
        const prior = item.id ? byId.get(item.id) : undefined;
        if (prior) {
            out.push({
                id: prior.id,
                at: prior.at,
                request: item.request,
                kind,
                notes: item.notes ?? prior.notes,
                imageUrl: item.imageUrl ?? prior.imageUrl,
            });
        } else {
            // Mint against existing + already-emitted so multiple new items get distinct ids.
            out.push({
                id: nextAdjustmentId([...existing, ...out]),
                at: nowIso,
                request: item.request,
                kind,
                notes: item.notes || undefined,
                imageUrl: item.imageUrl || undefined,
            });
        }
    }
    return out;
}

/** Normalize/validate the gate's operations array. Keeps only well-formed structural/cosmetic ops. */
export function normalizeOperations(raw: unknown): EditOperation[] {
    const arr = Array.isArray(raw) ? raw : [];
    const out: EditOperation[] = [];
    for (const o of arr) {
        const kind = (o as any)?.kind;
        const description = typeof (o as any)?.description === 'string' ? (o as any).description.trim() : '';
        if ((kind !== 'structural' && kind !== 'cosmetic') || !description) continue;
        out.push({ kind, target: typeof (o as any)?.target === 'string' ? (o as any).target : '', description });
    }
    return out;
}

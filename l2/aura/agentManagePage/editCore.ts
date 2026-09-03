/// <mls fileReference="_102020_/l2/aura/agentManagePage/editCore.ts" enhancement="_blank" />

// Pure core for the page-edit flow (TASK-102020-agent-manage-page). No mls.* — testable directly.
//
// The gate (agentManagePage root) classifies the user request into typed operations OR rejects it.
// agentEditDefs then asks the LLM for the edited `definition` and validates it here before writing.
// The guards are schema-agnostic: they preserve page IDENTITY and, for genome-shaped defs (with
// `definition.layout`), keep the layout schema parseable. Mode pages (brief/uiSpec, no layout) pass
// the identity guard and skip the layout guard.

import { listLayoutElements } from '/_102020_/l2/aura/helpers/dsMatch/layoutElements.js';

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

/** The current edit request handed to the render's delta section. */
export interface CurrentEdit {
    request: string;
    operations?: EditOperation[];
    imageUrl?: string;
}

/**
 * Delta-mode prompt section for the render step: the page's CURRENT generated code + the SINGLE
 * change the user just asked for (not a historical log — the current code already embodies every
 * earlier edit, and the edited `definition` already carries this one). Pure. Returns '' when there
 * is nothing to preserve/apply.
 */
export function buildDeltaSection(
    currentCode: string | null | undefined,
    edit: CurrentEdit | null | undefined,
): string {
    const hasCode = !!currentCode && currentCode.trim().length > 0;
    const request = edit?.request?.trim();
    if (!hasCode && !request) return '';
    const parts: string[] = ['## Edit mode — minimal change'];
    if (request) {
        const ops = (edit?.operations ?? []).filter(o => o.description?.trim());
        parts.push(
            '',
            'Apply ONLY this visual change; keep everything else in the current code structurally identical:',
            `- ${request}`,
            ...ops.map(o => `  · (${o.kind}${o.target ? ` @${o.target}` : ''}) ${o.description}`),
        );
        if (edit?.imageUrl) {
            // Text-only prompt: the model gets the URL, not the pixels — best-effort nudge.
            parts.push(
                '',
                `Reference image: ${edit.imageUrl} — that URL is the visual target. Reproduce its layout, spacing and formatting as faithfully as the existing states, actions and design-system tokens allow. If you cannot access the image, still honor the change text exactly.`,
            );
        }
    }
    if (hasCode) {
        parts.push('', '### Current code (preserve verbatim except for the change above)', '```ts', currentCode!.trim(), '```');
    }
    return parts.join('\n');
}

// ─── how an edit is represented INSIDE the definition (single source of truth) ────────────────
// Shared by the edit LLM (agentEditDefs — how to WRITE it) and documented for the render skills
// (genCfePageGenome — how to HONOR it). Everything the user asks lives in the definition; there is
// no separate pageAdjustments log anymore, so a variation inherits edits for free via the origin
// clone in the genome flow.
export const DEFINITION_EDIT_RULES = `
Fold the requested change PERMANENTLY into the definition:
- \`structural\` (hide/move/reorder/re-present an EXISTING element) → edit the \`definition.layout\`
  tree directly (remove/reorder/relocate the node).
- \`cosmetic\` (alignment, spacing, emphasis, sizing feel — no structural attribute exists) → attach
  a concise \`visualStyle\` field to the MOST SPECIFIC node it applies to (a field/filter/action, an
  intention, or a section). \`visualStyle\` is a short imperative string (or string[]) the render
  reads from the definition, e.g. \`"visualStyle": "align the action buttons to the left"\`. Do NOT
  use \`layoutRules\` for this — that bucket is regenerated from the design-system config.
- Reference image: if the request carries an image URL, add a \`styleReference\` field (the URL) on
  the SAME node that received the change, so the renderer can consult it.
- Supersede contradictions: if the definition ALREADY carries a \`visualStyle\`/\`styleReference\`
  that the new change contradicts, UPDATE/replace it — newer wins. Never stack contradictory hints.

Hard rules:
- NEVER change identity fields (pageId, moduleName, genome, baseClassName, routePattern).
- NEVER rename or invent element ids; only touch elements that already exist.
- NEVER add data, states or actions that are not already in the definition.
- Preserve the definition's schema exactly (same shape the render expects) apart from the folds above.`;

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

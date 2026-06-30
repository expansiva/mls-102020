/// <mls fileReference="_102020_/l2/dsMatch/layoutElements.ts" enhancement="_blank" />

// Pure enumerator over a page's `definition.layout` tree. It ONLY lists the elements
// that can receive a molecule (with enough context for the LLM to choose a group, and a
// live `ref` so the deterministic step can place `el.ref.molecule`). It does NOT decide
// the group — Agent1 (LLM) does that. No fixed inputType→group map here on purpose.
//
// Element kinds:
//   field      — an input inside a commandForm/queryList intention (fields[])
//   filter     — a filter control of a queryList (filters[])
//   action     — a button (toolbar[]/rowActions[]/actions[])
//   container  — the intention itself, for collection/summary/status intents
//                (queryList/summary/workflowStatus). commandForm/actionList have no
//                container molecule — their fields/actions carry the molecules.

export type ElementKind = 'field' | 'filter' | 'action' | 'container';

export interface LayoutElement {
    id: string;
    kind: ElementKind;
    organismName: string;
    intent: string;
    inputType?: string;
    labelKey?: string;
    purpose?: string;
    /** Live reference to the node in `definition.layout` (set `.molecule` here). */
    ref: any;
}

const CONTAINER_INTENTS = new Set(['queryList', 'summary', 'workflowStatus']);

/** Walk `definition.layout` → flat list of molecule-eligible elements. Pure; no group choice. */
export function listLayoutElements(layout: any): LayoutElement[] {
    const out: LayoutElement[] = [];
    for (const sec of layout?.sections ?? []) {
        for (const org of sec?.organisms ?? []) {
            const organismName: string = org?.organismName ?? '';
            for (const it of org?.intentions ?? []) {
                const intent: string = it?.intent ?? '';
                const base = { organismName, intent };

                if (CONTAINER_INTENTS.has(intent) && it?.id) {
                    out.push({ ...base, id: it.id, kind: 'container', labelKey: it.titleKey, purpose: it.titleKey, ref: it });
                }
                for (const f of it?.fields ?? []) {
                    if (f?.id) out.push({ ...base, id: f.id, kind: 'field', inputType: f.inputType, labelKey: f.labelKey, ref: f });
                }
                for (const f of it?.filters ?? []) {
                    if (f?.id) out.push({ ...base, id: f.id, kind: 'filter', inputType: f.inputType, labelKey: f.labelKey, ref: f });
                }
                for (const a of [...(it?.toolbar ?? []), ...(it?.rowActions ?? []), ...(it?.actions ?? [])]) {
                    if (a?.id) out.push({ ...base, id: a.id, kind: 'action', labelKey: a.labelKey, ref: a });
                }
            }
        }
    }
    return out;
}

/** id → element, for O(1) placement during the deterministic resolve. */
export function indexById(elements: LayoutElement[]): Map<string, LayoutElement> {
    return new Map(elements.map(e => [e.id, e]));
}

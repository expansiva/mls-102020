/// <mls fileReference="_102020_/l2/dsMatch/agent1.test.ts" enhancement="_blank" />

// Tests for the pure parts of agent1.ts (Fase B, element-level): buildAgent1HumanPrompt,
// validateAgent1Output, layoutElementIds + the layoutElements enumerator. No `mls` runtime.
// Exposes `runAgent1Tests()` — throws on failure, returns the case count.

import {
    validateAgent1Output,
    buildAgent1HumanPrompt,
    layoutElementIds,
} from '/_102020_/l2/dsMatch/agent1.js';
import { listLayoutElements } from '/_102020_/l2/dsMatch/layoutElements.js';
import type { GroupInfo } from '/_102020_/l2/dsMatch/groupCatalog.js';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[agent1.test] FAIL: ${msg}`);
}

const groups: GroupInfo[] = [
    { group: 'groupEnterText', description: 'Enter free-form text.' },
    { group: 'groupSelectOne', description: 'Choose one option.' },
    { group: 'groupViewData', description: 'Display a collection of records.' },
];

// Minimal layout: a commandForm (1 field + 1 action) and a queryList (container + 1 filter).
const layout = {
    pageId: 'p', layoutId: 'p.layout',
    sections: [{
        id: 'sec', type: 'section', sectionName: 'S', titleKey: 's', mode: 'edit', order: 10,
        organisms: [{
            id: 'org1', type: 'organism', organismName: 'Form', titleKey: 'o', purpose: '',
            userActions: [], requiredEntities: [], readsFields: [], writesFields: [], rulesApplied: [], order: 10,
            intentions: [
                {
                    id: 'intent_form', intent: 'commandForm', order: 10,
                    fields: [{ id: 'field_name', field: 'name', labelKey: 'l', order: 10, inputType: 'text' }],
                    columns: [], filters: [], toolbar: [], rowActions: [],
                    actions: [{ id: 'action_submit', action: 'submit', labelKey: 'a', order: 10, actionKey: 'submit' }],
                },
                {
                    id: 'intent_list', intent: 'queryList', order: 20,
                    fields: [], columns: [], filters: [{ id: 'filter_status', field: 'status', labelKey: 'f', order: 10, inputType: 'select' }],
                    toolbar: [], rowActions: [], actions: [],
                },
            ],
        }],
    }],
} as any;

export function runAgent1Tests(): { passed: number } {
    let passed = 0;

    // 1. listLayoutElements: field + action + (queryList container) + filter; commandForm has no container.
    {
        const els = listLayoutElements(layout);
        const ids = els.map(e => e.id).sort();
        assert(JSON.stringify(ids) === JSON.stringify(['action_submit', 'field_name', 'filter_status', 'intent_list']),
            `element ids wrong: ${JSON.stringify(ids)}`);
        const field = els.find(e => e.id === 'field_name')!;
        assert(field.kind === 'field' && field.inputType === 'text', 'field element wrong');
        const container = els.find(e => e.id === 'intent_list')!;
        assert(container.kind === 'container' && container.intent === 'queryList', 'container element wrong');
        assert(!els.some(e => e.id === 'intent_form'), 'commandForm must not produce a container');
        passed++;
    }

    // 2. validateAgent1Output: keep valid id+group, drop unknown id/group, dedupe by id, keep order.
    {
        const validIds = layoutElementIds(layout);
        const validGroups = new Set(groups.map(g => g.group));
        const raw = {
            path: 'p.ts',
            assignments: [
                { id: 'field_name', group: 'groupEnterText' },
                { id: 'field_name', group: 'groupSelectOne' },   // dup id → dropped
                { id: 'bogus_id', group: 'groupEnterText' },     // unknown id → dropped
                { id: 'filter_status', group: 'groupBogus' },    // unknown group → dropped
                { id: 'intent_list', group: 'groupViewData' },
            ],
        };
        const out = validateAgent1Output(raw, validIds, validGroups, 'fallback.ts');
        assert(out.path === 'p.ts', 'path should come from raw when present');
        assert(JSON.stringify(out.assignments) === JSON.stringify([
            { id: 'field_name', group: 'groupEnterText' },
            { id: 'intent_list', group: 'groupViewData' },
        ]), `assignments wrong: ${JSON.stringify(out.assignments)}`);
        passed++;
    }

    // 3. validateAgent1Output: garbage → empty assignments, fallback path.
    {
        const out = validateAgent1Output({}, new Set(['field_name']), new Set(['groupEnterText']), 'fallback.ts');
        assert(out.path === 'fallback.ts' && out.assignments.length === 0, 'garbage should yield empty output');
        passed++;
    }

    // 4. buildAgent1HumanPrompt smoke: includes path, element ids/inputType, and the group list.
    {
        const prompt = buildAgent1HumanPrompt('cafe/menu.defs.ts', listLayoutElements(layout), groups);
        assert(prompt.includes('cafe/menu.defs.ts'), 'prompt missing page path');
        assert(prompt.includes('id=field_name'), 'prompt missing element id');
        assert(prompt.includes('inputType=text'), 'prompt missing inputType');
        assert(prompt.includes('groupEnterText: Enter free-form text.'), 'prompt missing group list');
        passed++;
    }

    console.log(`[agent1.test] OK — ${passed} cases`);
    return { passed };
}

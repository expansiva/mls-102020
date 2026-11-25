/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPagePrompts.ts" enhancement="_blank"/>

// Prompts and tools of agentEditPage (TASK-102020-agent-edit-page). Pure: the steps hand in what they read.
//
// The contract in the prompts is only what keeps the page working (overconstrained-generative-prompts): the
// direction of the change comes from the person's request, never from a rule here.

import { DEFS_HISTORY_ASPECTS, type DefsHistoryEntry } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import type { EditOperation, EditStandard, MethodOutline, PageDefinitionDigest } from '/_102020_/l2/aura/agentEditPage/editPageCore.js';

export const EDIT_PAGE_GATE_TOOL = 'submitEditPlan';
export const EDIT_PAGE_PATCH_TOOL = 'submitPagePatch';
export const EDIT_PAGE_STANDARD_TOOL = 'submitStandard';

export const EDIT_PAGE_GATE_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
<!-- x-tool-strict: true -->

You decide whether a change a person asks for on ONE generated page of a business app can be made in that page's
own file, and you turn it into operations. Answer with \`${EDIT_PAGE_GATE_TOOL}\`.

## What you receive

- **The request**, in the person's words.
- **The page**: its intent and its organisms (the blocks of the screen), each with the purpose of its section.
- **The page file, outlined**: each method, the organisms it wraps (\`data-organism-id\`), the texts and molecules it uses.
- **Shared declaration**: everything the page can read and call. It is CLOSED: data, states and actions that are not
  there do not exist for this page.
- **User edits already on the page** (when there are any): earlier changes. Changing or undoing one of them is a
  normal request.
- **The selected element** (when there is one): what the person pointed at on screen; "this", "isto", "esse" in
  the request mean it. Its markup in the page file is given when it could be located.
- **Marks on the page** (when there are any): what the person circled on screen, numbered, each with the elements
  it encloses and, sometimes, a note saying what to do there. "Here", "this", "aqui", "isto" mean the marks. Every
  mark with a note asks for something; a mark without a note says WHERE the request applies.

## In scope: what the page file alone can do with what the shared already offers

Position, order, grouping, spacing, size, alignment, emphasis, color (design tokens), borders, shadows, the words
on screen (a new text), showing or hiding what is already on the page, another way to show the same data (a list as
cards, a table as a list) with the molecules the page already uses. A presentation change never needs a new field,
so "the page definition has no attribute for it" is never a reason to refuse.

## Out of scope: refuse

A field, filter, query, command or action the shared does not declare; new state; a business rule; a backend change;
another page, navigation or permission; a molecule the page does not use yet. On a molecule (a \`group…--ml-…\` tag)
only its APPEARANCE may change, through what its skill documents: \`class\` and \`data-class\` on its tag and on its
slots (\`<Value data-class="…">\`), and its configuration attributes (size, data-variant…). Its BEHAVIOR is out of
scope for now: what its events do, the data or state it is bound to, its inner markup and logic, or another
molecule in its place. Refuse with \`verdict: "refuse"\` and
a \`reason\` in the person's language that says what is missing and where it is changed (the page definition and
its contract, by regenerating the defs).

## Operations

One per organism and aspect touched. \`organism\` is an id of the page's organisms, or null for the page shell
(the title area, the overall arrangement). \`aspect\` is one of: ${DEFS_HISTORY_ASPECTS.join(', ')}.
\`change\` is the instruction in English, precise and self-contained: it will also be given to the generator that
rebuilds the page later, which will not see this request nor the current markup. \`summary\` is the same change in
the person's language, short, for them to confirm. \`revert\` is true only when the person asks to undo an earlier
user edit of that organism and aspect (then \`change\` says what to bring back). \`mark\` is the number of the
mark the operation answers, or null when it answers the request as a whole (always null without marks). With \`verdict: "refuse"\`,
\`operations\` is empty; with \`verdict: "apply"\`, \`reason\` is empty.`;

export const EDIT_PAGE_PATCH_SYSTEM_PROMPT = `<!-- modelType: code -->
<!-- x-tool-strict: true -->

You change ONE generated page of a business app (Lit 3 + TypeScript + Tailwind) as the approved operations say.
Answer with \`${EDIT_PAGE_PATCH_TOOL}\`: the COMPLETE methods you changed, the new texts, and one line of notes.

## How your answer is applied

Each method you return replaces the method of the same name, whole. A method with a new name (a new \`render*\`
helper) is added to the class. Nothing else of the file changes, so:
- return only the methods listed for the operations (\`→ methods\`: those that wrap the organism, or render() and the
  methods that wrap no organism when the organism has no wrapper of its own), plus any new helper you extract;
- each \`code\` starts with the method's own declaration and ends with its closing brace.

## Contract: only what keeps the app working

- The page holds no state and calls no backend: no \`@property\`/\`@state\`, no assignment to \`this.…\` (the
  \`this.msg = …\` line of render() stays as it is), no \`async\`/\`await\`, no fetch, timers or storage. Events
  call the public members of the shared, as the file already does.
- Use only members the shared declaration offers. No new import: a change that needs one is out of scope.
- Keep every \`data-organism-id\` wrapper. To hide an organism, render its wrapper under a condition or hide what
  is inside it.
- Views switch only through the scene host the file already uses.
- Text comes from the catalogue: a new visible word is a new key in \`messages\` (camelCase identifier, read as
  \`m.<key>\` like the file does), with a text for each locale given. Never write literal text in the markup and
  never change an existing key.
- Color only from the design tokens given, as \`bg-[var(--<token>,transparent)]\`, \`text-[var(--<token>,currentColor)]\`,
  \`border-[var(--<token>,currentColor)]\`: no palette classes, \`#hex\` or \`dark:\`. All other Tailwind is yours.
- On a molecule change only its appearance: \`class\`/\`data-class\` on its tag and on its slots, and its configuration
  attributes (size, data-variant…), as its skill documents. Keep every event (\`@x=\`) and property (\`.x=\`, \`?x=\`)
  binding of it exactly as it is.
- Keep the user edits listed: they are changes the person made before, not yours to undo (unless an operation says so).
- It compiles under strict TypeScript.

\`notes\` is one line, in the person's language, saying what changed on screen.`;

/** The gate tool: verdict + operations, strict. */
export function editPageGateSchema(organisms: readonly string[]): Record<string, unknown> {
  return {
    type: 'object', additionalProperties: false, required: ['verdict', 'reason', 'operations'],
    properties: {
      verdict: { type: 'string', enum: ['apply', 'refuse'] },
      reason: { type: 'string', description: 'Why it is refused, in the person\'s language; empty when applied.' },
      operations: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['organism', 'aspect', 'change', 'summary', 'revert', 'mark'],
          properties: {
            organism: { type: ['string', 'null'], enum: [...organisms, null], description: 'Organism id; null for the page shell.' },
            aspect: { type: 'string', enum: [...DEFS_HISTORY_ASPECTS] },
            change: { type: 'string', description: 'The instruction in English, self-contained.' },
            summary: { type: 'string', description: 'The same change, short, in the person\'s language.' },
            revert: { type: 'boolean' },
            mark: { type: ['integer', 'null'], description: 'The mark this operation answers; null for the request as a whole.' },
          },
        },
      },
    },
  };
}

/** The patch tool: methods as code, new texts as data, one line of notes; strict. */
export function editPagePatchSchema(locales: readonly string[]): Record<string, unknown> {
  return {
    type: 'object', additionalProperties: false, required: ['methods', 'messages', 'notes'],
    properties: {
      methods: {
        type: 'array', description: 'One entry per method changed or added.',
        items: {
          type: 'object', additionalProperties: false, required: ['name', 'code'],
          properties: {
            name: { type: 'string', description: 'The method name, as declared.' },
            code: { type: 'string', description: 'The COMPLETE method: its declaration through its closing brace.' },
          },
        },
      },
      messages: {
        type: 'array', description: 'New catalogue keys; empty when no new text.',
        items: {
          type: 'object', additionalProperties: false, required: ['key', 'texts'],
          properties: {
            key: { type: 'string', description: 'camelCase identifier, new.' },
            texts: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false, required: ['locale', 'text'],
                properties: { locale: { type: 'string', enum: [...locales] }, text: { type: 'string' } },
              },
            },
          },
        },
      },
      notes: { type: 'string', description: 'One line, in the person\'s language: what changed on screen.' },
    },
  };
}

/** The selected element, as the prompts show it (editPageIo SelectedElementContext has this shape). */
export interface SelectedElementPrompt {
  element: { tag: string; organism: string | null; organismPath: string; literal: string };
  located: { method: string | null; snippet: string; renders: number } | null;
  molecule: { tag: string; slot: string | null; skill: string; usage: string } | null;
}

/** A mark of the page, as the prompts show it (editPageIo MarkContext has this shape). */
export interface MarkPrompt {
  n: number;
  note: string | null;
  elements: SelectedElementPrompt[];
}

export interface EditPageGateInput {
  request: string;
  pageLabel: string;
  definition: PageDefinitionDigest;
  outline: readonly MethodOutline[];
  sharedDeclaration: string;
  history: readonly DefsHistoryEntry[];
  selected?: SelectedElementPrompt | null;
  marks?: readonly MarkPrompt[];
  /** The other pages the same request goes to (consistency only). */
  batch?: readonly string[];
  /** Adjustments of a preview: the request is already applied and the page file shows it; plan the newest one. */
  adjust?: readonly string[];
  /** The common standard of the batch: binding. */
  standard?: EditStandard | null;
}

/** The adjustment to plan: the request is already in the file, plan only the newest ask (the earlier ones are in too). */
export function gateAdjustLines(adjust: readonly string[] | null | undefined): string[] {
  if (!adjust?.length) return [];
  return [
    '# The adjustment to plan now',
    'The request above was ALREADY applied: the page file outlined below shows its result, and the person looked at it on screen.',
    'Plan ONLY the adjustment asked now (the earlier ones are already in the file too). It may touch any organism, not only the ones the request touched.',
    'Refuse, with the reason, when the page file alone cannot do it.',
    ...adjust.map((text, index) => `- ${index === adjust.length - 1 ? 'Now' : `Earlier (${index + 1})`}: ${text}`),
    '',
  ];
}

/** The same request goes to other pages of the module: the answer must look the same on all of them. */
export function batchLines(batch: readonly string[] | null | undefined): string[] {
  if (!batch?.length) return [];
  return [
    `# The same request goes to ${batch.length + 1} pages of the module`,
    `The other pages: ${batch.join(', ')}. Each page is changed on its own, without seeing the others.`,
    'Answer so the result looks the same on every page: the same design tokens, sizes and form for the same kind of element; no choice that only makes sense here.',
    'If this page has nothing the request is about, refuse saying so (the other pages go on).',
    '',
  ];
}

/** The common standard: the same exact classes on every page, already decided — not the model's to choose. */
export function standardLines(standard: EditStandard | null | undefined): string[] {
  if (!standard?.rules.length) return [];
  return [
    '# The common standard — binding on every page of the request',
    'Decided once for all the pages. For each element below, use EXACTLY these classes, replacing the classes of the same',
    'kind it has now (size, weight, spacing, alignment…). Never pick other values for them; an element this page does not',
    'have is skipped. In a plan, each `change` names the classes verbatim.',
    ...standard.rules.map(rule => `- ${rule.what}: ${rule.classes}`),
    '',
  ];
}

function historyLines(history: readonly DefsHistoryEntry[]): string[] {
  if (!history.length) return [];
  return ['# User edits already on the page (oldest first)', '```json', JSON.stringify(history, null, 2), '```', ''];
}

/** What the person pointed at: the element, where it is in the file, and the molecule's documentation. */
export function selectedElementLines(selected: SelectedElementPrompt | null | undefined): string[] {
  if (!selected) return [];
  return ['# The selected element — what the person pointed at on screen', ...elementLines(selected, '##')];
}

/** What the person circled: each mark, its note, and its elements as the selection shows one. */
export function markedLines(marks: readonly MarkPrompt[] | null | undefined): string[] {
  if (!marks?.length) return [];
  return [
    '# Marked on the page — what the person circled on screen',
    '',
    ...marks.flatMap(mark => [
      `## Mark ${mark.n}${mark.note ? ` — note: "${mark.note}"` : ' — no note (it says where)'}`,
      ...mark.elements.flatMap(element => elementLines(element, '###')),
    ]),
  ];
}

function elementLines(selected: SelectedElementPrompt, heading: string): string[] {
  const { element, located, molecule } = selected;
  return [
    `- tag: ${element.tag}; organism: ${element.organism ?? '(page shell)'}; path in the organism: ${element.organismPath || '(none)'}`
      + `${element.literal ? `; class: "${element.literal}"` : ''}`,
    ...(located
      ? [`- in the page file, in method ${located.method ?? '(module level)'}${located.renders > 1 ? ` (rendered ${located.renders} times: a change applies to all)` : ''}:`,
        '```html', located.snippet.trim(), '```']
      : ['- it could not be located in the page file: identify it by tag, organism and class']),
    ...(molecule
      ? ['', `${heading} The selected molecule <${molecule.tag}>${molecule.slot ? ` — slot <${molecule.slot}>` : ''}`,
        'Only its appearance may change, through what this documentation offers (class and data-class on the tag and on its slots, configuration attributes).',
        '', `${heading}# Its skill`, molecule.skill || '(not found)',
        '', `${heading}# The usage contract of its group`, molecule.usage.trim() || '(not found)']
      : []),
    '',
  ];
}

export function editPageGatePrompt(input: EditPageGateInput): string {
  return [
    input.adjust?.length ? '# The request (already applied)' : '# The request',
    input.request,
    '',
    ...gateAdjustLines(input.adjust),
    `# The page — ${input.pageLabel}`,
    `Intent: ${input.definition.intent || '(none)'}`,
    '',
    'Organisms:',
    ...input.definition.organisms.map(item => `- ${item.id} (${item.kind}) — ${item.text}${item.purpose ? ` [section ${item.section}: ${item.purpose}]` : ''}`),
    '',
    '# The page file, outlined',
    ...input.outline.map(method => `- ${method.name}()${method.organisms.length ? ` wraps ${method.organisms.join(', ')}` : ''}`
      + `${method.keys.length ? `; texts ${method.keys.join(', ')}` : ''}${method.molecules.length ? `; molecules ${method.molecules.join(', ')}` : ''}`
      + `${method.calls.length ? `; calls ${method.calls.join(', ')}` : ''}`),
    '',
    ...selectedElementLines(input.selected),
    ...markedLines(input.marks),
    ...batchLines(input.batch),
    ...standardLines(input.standard),
    ...historyLines(input.history),
    '# Shared declaration — what the page can read and call',
    '```ts', input.sharedDeclaration.trim() || '(not found)', '```',
  ].join('\n');
}

export interface EditPagePatchInput {
  pageLabel: string;
  operations: readonly EditOperation[];
  /** Method names each operation may touch. */
  methodsByOperation: Record<string, string[]>;
  source: string;
  sharedDeclaration: string;
  tokens: readonly string[];
  locales: readonly string[];
  history: readonly DefsHistoryEntry[];
  definition: PageDefinitionDigest | null;
  selected?: SelectedElementPrompt | null;
  marks?: readonly MarkPrompt[];
  /** Adjustments asked after the person saw the result: the page file below already holds it; the operations plan the newest. */
  adjust?: readonly string[];
  /** The other pages the same request goes to (consistency only). */
  batch?: readonly string[];
  /** The common standard of the batch: binding. */
  standard?: EditStandard | null;
  repair?: { diagnostic: string; previous: string };
}

/** The adjustment section: the result is already in the file, change it only as asked, the newest ask last. */
function adjustLines(adjust: readonly string[] | undefined): string[] {
  if (!adjust?.length) return [];
  return [
    '# Adjustment after the person saw the result',
    'The page file below ALREADY contains the result of the request and of the earlier adjustments. The person looked at it on screen and asked for an adjustment.',
    'The approved operations above are the plan of the adjustment asked now: change only what they say; keep everything else of the current result as it is.',
    ...adjust.map((text, index) => `- ${index === adjust.length - 1 ? 'Now' : `Earlier (${index + 1})`}: ${text}`),
    '',
  ];
}

export function editPagePatchPrompt(input: EditPagePatchInput): string {
  return [
    `# Approved operations — ${input.pageLabel}`,
    ...input.operations.map(op => `- ${op.id} ${op.organism ?? '(page shell)'} / ${op.aspect}${op.revert ? ' (revert)' : ''}${op.mark ? ` (mark ${op.mark})` : ''}: ${op.change}`
      + ` → methods: ${(input.methodsByOperation[op.id] ?? []).join(', ') || '(none)'}`),
    '',
    ...(input.definition ? [
      'Organisms of the page:',
      ...input.definition.organisms.map(item => `- ${item.id} (${item.kind}) — ${item.text}`),
      '',
    ] : []),
    ...selectedElementLines(input.selected),
    ...markedLines(input.marks),
    ...batchLines(input.batch),
    ...standardLines(input.standard),
    ...historyLines(input.history),
    `# Locales of the catalogue (default first): ${input.locales.join(', ') || '(no catalogue)'}`,
    '',
    `# Design tokens (color): ${input.tokens.join(', ') || '(none declared)'}`,
    '',
    ...adjustLines(input.adjust),
    '# The page file',
    '```ts', input.source.trim(), '```',
    '',
    '# Shared declaration — what the page can read and call',
    '```ts', input.sharedDeclaration.trim() || '(not found)', '```',
    ...(input.repair ? [
      '',
      '# Your previous answer was refused — fix only this',
      input.repair.diagnostic,
      '',
      'What you returned:',
      '```ts', input.repair.previous.trim(), '```',
    ] : []),
  ].join('\n');
}

export const EDIT_PAGE_STANDARD_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
<!-- x-tool-strict: true -->

A person asked the same change of several pages of one module of a business app (Lit + Tailwind). Before any page is
changed, you decide ONCE the exact values every page must use, so the pages end up the same. Answer with
\`${EDIT_PAGE_STANDARD_TOOL}\`.

## What you receive

- **The request**, in the person's words (and, when adjusting, the previous standard and the adjustment asked now).
- **The reference page file**: the page the request was asked from, whole. Its current classes are the starting point.
- **Pages the request names** (when it names any, e.g. "like the inicio page"), whole: then the values come from them.
- **The other pages, outlined**: their methods, the organisms each wraps, the texts and molecules they use.
- **Design tokens (color)**.

## The rules

One rule per kind of element the request is about (e.g. "page header title", "page header subtitle", "page header
container spacing"). \`what\` names the element so a model that sees only ONE page finds it there, in English.
\`classes\` is the exact Tailwind class list every page must use for it: size, weight, line height, spacing, alignment,
gap. Colors only as design tokens (\`text-[var(--<token>,currentColor)]\`, \`bg-[var(--<token>,transparent)]\`) — no
palette classes, \`#hex\` or \`dark:\`. \`summary\` says the same in the person's language, short, for them to approve.

Prefer values already on the pages (the reference page first, a page the request names above all) over new ones.
Only presentation: a rule never adds data, text or behavior. When the request asks for nothing that has a common value
(e.g. "add an icon to the button"), return no rules. When adjusting: return the WHOLE standard, the previous rules kept
as they are and only what the adjustment asks changed.`;

/** The standard tool: the rules, strict. */
export function editPageStandardSchema(): Record<string, unknown> {
  return {
    type: 'object', additionalProperties: false, required: ['rules'],
    properties: {
      rules: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['what', 'classes', 'summary'],
          properties: {
            what: { type: 'string', description: 'The element, in English, findable on any one page.' },
            classes: { type: 'string', description: 'The exact Tailwind classes every page uses for it.' },
            summary: { type: 'string', description: 'The same, short, in the person\'s language.' },
          },
        },
      },
    },
  };
}

export interface EditPageStandardInput {
  request: string;
  /** The adjustment of the standard asked now (with `previous`). */
  adjust?: readonly string[];
  previous?: EditStandard | null;
  pageLabel: string;
  source: string;
  /** Pages the request names, whole. */
  named: ReadonlyArray<{ page: string; source: string }>;
  others: ReadonlyArray<{ page: string; outline: readonly MethodOutline[] }>;
  tokens: readonly string[];
}

/** The pages a text names (a whole word, any case): the ones whose values the person points at. */
export function pagesNamedIn(text: string, pages: readonly string[]): string[] {
  const lower = text.toLowerCase();
  return pages.filter(page => new RegExp(`(^|[^a-z0-9_])${page.toLowerCase()}($|[^a-z0-9_])`, 'u').test(lower));
}

function outlineLines(outline: readonly MethodOutline[]): string[] {
  return outline.map(method => `  - ${method.name}()${method.organisms.length ? ` wraps ${method.organisms.join(', ')}` : ''}`
    + `${method.keys.length ? `; texts ${method.keys.join(', ')}` : ''}${method.molecules.length ? `; molecules ${method.molecules.join(', ')}` : ''}`);
}

export function editPageStandardPrompt(input: EditPageStandardInput): string {
  const asked = input.adjust?.length ? input.adjust[input.adjust.length - 1] : '';
  return [
    '# The request',
    input.request,
    '',
    ...(input.previous?.rules.length ? [
      '# The previous standard (already approved)',
      ...input.previous.rules.map(rule => `- ${rule.what}: ${rule.classes}`),
      '',
    ] : []),
    ...(asked ? ['# The adjustment asked now', asked, ''] : []),
    `# The pages: ${input.others.length + 1}`,
    '',
    `## The reference page — ${input.pageLabel}`,
    '```ts', input.source.trim(), '```',
    '',
    ...input.named.flatMap(item => [`## A page the request names — ${item.page}`, '```ts', item.source.trim(), '```', '']),
    '## The other pages, outlined',
    ...input.others.flatMap(item => [`- ${item.page}`, ...outlineLines(item.outline)]),
    '',
    `# Design tokens (color): ${input.tokens.join(', ') || '(none declared)'}`,
  ].join('\n');
}

/** The arguments of a forced tool call, from the step payload; throws `EDIT_PAGE_TOOL_*` when absent or malformed. */
export function editPageToolArguments(payload: unknown, toolName: string): unknown {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const result = root.type === 'flexible' ? root.result as Record<string, unknown> | undefined : undefined;
  if (result && result.toolName !== toolName) throw new Error(`EDIT_PAGE_TOOL_MISMATCH: expected ${toolName}`);
  const args = result ? result.arguments : root.arguments ?? root.payload ?? root;
  if (typeof args !== 'string') return args;
  try { return JSON.parse(args); } catch { throw new Error('EDIT_PAGE_TOOL_JSON: the tool arguments are not JSON'); }
}

/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPagePrompts.ts" enhancement="_blank"/>

// Prompts and tools of agentEditPage (TASK-102020-agent-edit-page). Pure: the steps hand in what they read.
//
// The contract in the prompts is only what keeps the page working (overconstrained-generative-prompts): the
// direction of the change comes from the person's request, never from a rule here.

import { DEFS_HISTORY_ASPECTS, type DefsHistoryEntry } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import type { EditOperation, MethodOutline, PageDefinitionDigest } from '/_102020_/l2/aura/agentEditPage/editPageCore.js';

export const EDIT_PAGE_GATE_TOOL = 'submitEditPlan';
export const EDIT_PAGE_PATCH_TOOL = 'submitPagePatch';

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
user edit of that organism and aspect (then \`change\` says what to bring back). With \`verdict: "refuse"\`,
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
          type: 'object', additionalProperties: false, required: ['organism', 'aspect', 'change', 'summary', 'revert'],
          properties: {
            organism: { type: ['string', 'null'], enum: [...organisms, null], description: 'Organism id; null for the page shell.' },
            aspect: { type: 'string', enum: [...DEFS_HISTORY_ASPECTS] },
            change: { type: 'string', description: 'The instruction in English, self-contained.' },
            summary: { type: 'string', description: 'The same change, short, in the person\'s language.' },
            revert: { type: 'boolean' },
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

export interface EditPageGateInput {
  request: string;
  pageLabel: string;
  definition: PageDefinitionDigest;
  outline: readonly MethodOutline[];
  sharedDeclaration: string;
  history: readonly DefsHistoryEntry[];
  selected?: SelectedElementPrompt | null;
}

function historyLines(history: readonly DefsHistoryEntry[]): string[] {
  if (!history.length) return [];
  return ['# User edits already on the page (oldest first)', '```json', JSON.stringify(history, null, 2), '```', ''];
}

/** What the person pointed at: the element, where it is in the file, and the molecule's documentation. */
export function selectedElementLines(selected: SelectedElementPrompt | null | undefined): string[] {
  if (!selected) return [];
  const { element, located, molecule } = selected;
  return [
    '# The selected element — what the person pointed at on screen',
    `- tag: ${element.tag}; organism: ${element.organism ?? '(page shell)'}; path in the organism: ${element.organismPath || '(none)'}`
      + `${element.literal ? `; class: "${element.literal}"` : ''}`,
    ...(located
      ? [`- in the page file, in method ${located.method ?? '(module level)'}${located.renders > 1 ? ` (rendered ${located.renders} times: a change applies to all)` : ''}:`,
        '```html', located.snippet.trim(), '```']
      : ['- it could not be located in the page file: identify it by tag, organism and class']),
    ...(molecule
      ? ['', `## The selected molecule <${molecule.tag}>${molecule.slot ? ` — slot <${molecule.slot}>` : ''}`,
        'Only its appearance may change, through what this documentation offers (class and data-class on the tag and on its slots, configuration attributes).',
        '', '### Its skill', molecule.skill || '(not found)',
        '', '### The usage contract of its group', molecule.usage.trim() || '(not found)']
      : []),
    '',
  ];
}

export function editPageGatePrompt(input: EditPageGateInput): string {
  return [
    '# The request',
    input.request,
    '',
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
  repair?: { diagnostic: string; previous: string };
}

export function editPagePatchPrompt(input: EditPagePatchInput): string {
  return [
    `# Approved operations — ${input.pageLabel}`,
    ...input.operations.map(op => `- ${op.id} ${op.organism ?? '(page shell)'} / ${op.aspect}${op.revert ? ' (revert)' : ''}: ${op.change}`
      + ` → methods: ${(input.methodsByOperation[op.id] ?? []).join(', ') || '(none)'}`),
    '',
    ...(input.definition ? [
      'Organisms of the page:',
      ...input.definition.organisms.map(item => `- ${item.id} (${item.kind}) — ${item.text}`),
      '',
    ] : []),
    ...selectedElementLines(input.selected),
    ...historyLines(input.history),
    `# Locales of the catalogue (default first): ${input.locales.join(', ') || '(no catalogue)'}`,
    '',
    `# Design tokens (color): ${input.tokens.join(', ') || '(none declared)'}`,
    '',
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

/** The arguments of a forced tool call, from the step payload; throws `EDIT_PAGE_TOOL_*` when absent or malformed. */
export function editPageToolArguments(payload: unknown, toolName: string): unknown {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const result = root.type === 'flexible' ? root.result as Record<string, unknown> | undefined : undefined;
  if (result && result.toolName !== toolName) throw new Error(`EDIT_PAGE_TOOL_MISMATCH: expected ${toolName}`);
  const args = result ? result.arguments : root.arguments ?? root.payload ?? root;
  if (typeof args !== 'string') return args;
  try { return JSON.parse(args); } catch { throw new Error('EDIT_PAGE_TOOL_JSON: the tool arguments are not JSON'); }
}

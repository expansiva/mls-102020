/// <mls fileReference="_102020_/l2/aura/molecules/skills/indexGroupPage.ts" enhancement="_blank" />

export const skill = `# Metadata
- Files: l2/molecules/{groupname}/index.ts  +  l2/molecules/{groupname}/index.html
- CustomElement: molecules--{groupname}--index-{actualProjectId}
- ClassName: Group{GroupName}Index
- {groupname} is ALWAYS the group name in lowercase (e.g. groupEnterBoolean → groupenterboolean).
  Apply lowercase in: imports, custom element tag names in the template, and fileReference path in the triple-slash header.

# Objective
Create a visual showcase page for a molecule group that presents every component in the group with live interactive examples and a quick-reference decision table. The page serves as both documentation and a live playground, helping developers pick the right component for their context.

# Structure

## index.ts
A Lit Web Component extending StateLitElement. Three PARTS are mandatory, each implemented as a private method
returning TemplateResult: the hero, the showcase and the reference table. The hero and the reference table are ONE
method each. The showcase is one method **per family** (see "Organize by what differs") — a group whose molecules
separate in three different ways has three showcase methods, and render() calls them in order.

## index.html
A single line containing only the custom element tag:
<molecules--{groupname}--index-{actualProjectId}></molecules--{groupname}--index-{actualProjectId}>

# Section layouts

The CHROME is fixed: copy the hero, the card shell, the accent colors and the reference table exactly as given.
The ARRANGEMENT is yours — how many showcase sections there are, what goes in each one, and how the cards sit
inside them is decided by what SEPARATES the molecules of this group. Never repeat one layout N times by default.

## renderHero()

\`\`\`html
<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-8 py-20 text-center">
  <span class="inline-block px-3 py-1 bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 rounded-full text-xs font-semibold uppercase tracking-widest mb-6">
    {groupname in camelCase}
  </span>
  <h1 class="text-5xl font-bold text-slate-900 dark:text-slate-50 mb-5 tracking-tight">
    {Short human label, e.g. "Enter Boolean"}
  </h1>
  <p class="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
    {1–2 sentence subtitle describing the shared problem space and available implementations}
  </p>
</header>
\`\`\`

## The showcase sections — organize by what differs

Before writing a single card, answer: **what separates these molecules from each other?** The group
contract is the SAME for all of them, so the contract is never the answer. Sort them into families:

| the family differs by | how you make it visible |
|---|---|
| **finish** — same API, different density or ornament | put them SIDE BY SIDE with the SAME data, in a grid. Stacked in one column nobody can compare them |
| **space** — the molecule changes shape by itself | give it its own container, and say in the card what the real rule is. Read the molecule's \`.less\`: \`@container\` reacts to the container, \`@media\` reacts to the WINDOW, and a card cannot fake the second one |
| **the shape of the data** — it groups, pivots, totals | give that family its OWN dataset. A grouping needs a column with REPEATED values; a total needs two numeric columns; a pivot needs an already-aggregated cross-tab |
| **the gesture** — it opens a record, and each one opens it elsewhere | these are the most confusable in any group. Show them ALREADY usable and name the gesture in the card: which control opens it, and where the detail appears |
| **live content** — the slot accepts a component, not text | put a real molecule inside the slot. This is the only family where \`is-editing\` reaches anything |

A molecule with NO exclusive property, slot or event is not a mistake — it is the signal that it
belongs to one of the first four families, and that a static card will never tell it apart from its
siblings.

Give each family its own section with a \`<h2>\` naming what it separates, and a one-line subtitle
saying what the reader should try. One section for the whole group is correct ONLY when the group
really has one family.

## The card shell (fixed — copy verbatim)

\`\`\`html
<section class="bg-slate-50 dark:bg-slate-950 px-8 py-12 border-b border-slate-200 dark:border-slate-700">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-50">{what this family separates}</h2>
    <p class="mt-2 mb-8 text-sm text-slate-500 dark:text-slate-400 max-w-3xl">{what to try, in one line}</p>

    <!-- one or more cards, laid out as the family requires: grid for a comparison,
         a narrow container for a space demo, a single wide card for a rich one -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div class="flex items-center justify-between gap-3 mb-1">
        <p class="text-sm font-bold text-slate-900 dark:text-slate-50">Display Name</p>
        <code class="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">tag-name</code>
      </div>
      <p class="text-xs text-slate-400 mb-4">{what THIS molecule does that its siblings do not}</p>
      <{groupname}--{component} ...>
        <!-- realistic content in every slot tag the molecule declares -->
      </{groupname}--{component}>
      {the last-event line — see below}
    </div>

  </div>
</section>
\`\`\`

Accent bar colors rotate through: violet, emerald, amber, rose, sky, indigo, purple, teal, orange,
pink. A group may show the same component more than once when different configurations deserve
separate illustration.

## Wire the contract, not the envelope

\`name\`, \`.value\` and \`@change\` are the ENVELOPE — every card has them and they prove nothing. On top
of that, each card MUST:

1. **bind every event the molecule emits.** Read them from the molecule's own file
   (\`dispatchEvent(new CustomEvent('x'\`, and any \`emit('x'\` helper), not only from the group contract —
   a group table lists what the GROUP emits, and a single molecule often emits more;
2. **set the attributes that turn its feature ON.** Many are read with \`hasAttribute(...)\` inside the
   molecule and appear in no contract table: without them the feature renders as nothing and the card
   looks like every other card. Measured: a grouping table with no \`groupable\` on any \`<TableHead>\`
   renders an EMPTY group selector; a table with \`showRowTotal\` unset shows no totals; a record form
   whose rows carry no \`open\` action can never open the form. Grep the molecule for \`hasAttribute(\`
   and for its boolean properties, and switch on what defines it;
3. **show the last event received**, so the reader sees the wiring work:

\`\`\`html
<p class="mt-3 text-[11px] font-mono text-slate-400 dark:text-slate-500">
  último evento: <span class="text-slate-600 dark:text-slate-300">\${this.lastEvent['card-x']}</span>
</p>
\`\`\`

with one handler that records \`e.type\` and \`e.detail\` into a \`@state()\` map. Read the value from
**\`e.detail\`**, never from \`e.target.value\`: the molecule settles \`detail\` on every event, and
\`target.value\` is stale for any event that is not a confirmed change.

Measured on a real run: a showcase whose 13 cards each carried only the envelope demonstrated 2 of the
group's 34 contract items, and 1 of the 39 events the library emits.

## The data

One dataset per NEED, declared as a const above the class — not one dataset for the page. A set that
suits a flat listing does not suit a grouping (it needs repeated values), a total (two numeric
columns), a pivot (an aggregated cross-tab) or pagination (more rows than a page). Keep them small and
realistic, and reuse one across a family whose whole point is comparing the SAME data.

## renderReferenceTable()

\`\`\`html
<section class="bg-slate-100 dark:bg-slate-950 px-8 py-20 border-t border-slate-200 dark:border-slate-700">
  <div class="max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Quick reference</h2>
    <p class="text-sm text-slate-500 dark:text-slate-400 mb-8">{subtitle tailored to this group's decision — NOT a fixed string}</p>
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-3/4">Scenario</th>
            \${headers.map(h => html\`
              <th class="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide \${h.cls}">\${h.label}</th>
            \`)}
          </tr>
        </thead>
        <tbody>
          \${rows.map((row, i) => html\`
            <tr class="\${i % 2 !== 0 ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''} border-b border-slate-100 dark:border-slate-700/60 last:border-0">
              <td class="px-5 py-3.5 text-slate-700 dark:text-slate-300">\${row.scenario}</td>
              \${([row.componentA, row.componentB] as boolean[]).map(ok => html\`
                <td class="px-4 py-3.5 text-center">
                  \${ok
                    ? html\`<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>\`
                    : html\`<span class="text-slate-200 dark:text-slate-700 text-sm">—</span>\`}
                </td>
              \`)}
            </tr>
          \`)}
        </tbody>
      </table>
    </div>
  </div>
</section>
\`\`\`

Implement the \`rows\` and \`headers\` arrays at the top of renderReferenceTable(), before the return statement:

\`\`\`ts
const rows: Array<{ scenario: string; componentA: boolean; componentB: boolean }> = [
  { scenario: '...', componentA: true,  componentB: false },
  { scenario: '...', componentA: false, componentB: true  },
];
const headers = [
  { label: 'Component A', cls: 'text-{colorA}-600 dark:text-{colorA}-400' },
  { label: 'Component B', cls: 'text-{colorB}-600 dark:text-{colorB}-400' },
];
\`\`\`

Adapt the field names (componentA, componentB, ...) to the actual component names of the group.
Every distinct component in the group must appear as a column.

# Responsibilities
- Declare the custom element with @customElement('molecules--{groupname}--index-{actualProjectId}')
- Name the class Group{GroupName}Index (PascalCase, e.g. GroupEnterBooleanIndex)
- Always include these three imports at the top of index.ts, in this order:
  import { html, TemplateResult } from 'lit';
  import { customElement, state } from 'lit/decorators.js';
  import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
- Import each component module from its canonical path before using it in the template:
  import '/_actualProjectId_/l2/molecules/{groupname}/{component-name}';
  (groupname is lowercase in the import path)
- Declare one @state() property per showcase card with a sensible default for the value type:
  boolean → false, string → '', number → 0 (unless a non-empty default better illustrates the component)
- Group all showcase state declarations under the comment: // ── Showcase card states ─────────────────────────────────────
- Bind the value to the component correctly by type:
  - String values: attribute binding   value="\${this.cardX}"
  - Boolean / number / null values: property binding   .value=\${this.cardX}
- Separate sections with 80-char section banners: // =========================================================================== SECTION NAME
- Compose the hero, every showcase section and the reference table in render(), in order, inside a single <div class="font-sans min-h-screen">

# Constraints
- index.ts file header: /// <mls fileReference="_actualProjectId_/l2/molecules/{groupname}/index.ts" enhancement="_102020_/l2/enhancementAura"/>
  (groupname is lowercase in the fileReference path)
- The hero, at least one showcase section and the reference table are mandatory; none may be omitted
- Every live showcase instance must have realistic slot content for all available slot tags
- Do NOT pass .isEditing=\${true} by default. \`is-editing\` only reaches a WEB COMPONENT inside the slot — on
  plain text it does nothing. Measured: a showcase shipped it on all 13 cards and it was decorative in every one.
  Pass it only where the slot content IS a molecule, and say so in that card's description
- Do not hardcode hex colors; use only Tailwind utility classes

# Notes
- Group descriptions (name, purpose, available implementations) are defined in _102020_/l2/aura/molecules/skills/index.ts — use the corresponding entry's \`description\` field as the primary source for the hero subtitle and the reference table subtitle.
`;

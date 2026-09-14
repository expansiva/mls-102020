/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDifferentiators.ts" enhancement="_blank"/>

// What separates one molecule of a group from its siblings. Pure — no I/O: the caller (steps/s3-indexts)
// reads the molecule files and passes their text in, the same shape helpers/syExtract.ts already uses.
//
// ⚠️ WHY THIS EXISTS (measured 2026-09-14). The creation prompt used to receive the group's molecules as a
// LIST OF SHORT NAMES plus the GROUP contract — which is, by construction, identical for all of them. From
// the model's position the 13 tables of groupViewTable were the same component, so it wrote 13 identical
// cards. The page passed every gate and demonstrated 2 of the group's 34 contract items.
//
// Everything below was computed by a throwaway script while designing the groupViewTable showcase by hand,
// which is the proof it needs no LLM: it is grep over files the agent already has.
//
// THE THREE SIGNALS THAT DECIDE A SHOWCASE, in order of how often they were missed:
//
//   1. THE ON-SWITCH (`hasAttribute('x')`). The one nobody finds by reading a contract. Measured in
//      groupViewTable: `ml-grouping-table` renders an EMPTY group selector unless some `<TableHead>`
//      carries `groupable`; `ml-advanced-data-table` shows no totals unless `showRowTotal` is set;
//      `ml-record-form-table` can never open its form unless a row carries `<RowAction action="open">`.
//      Three molecules rendering as plain tables, for three missing attributes, none of them in the
//      group's usage.ts in a form a generator could find.
//   2. THE EVENT SET, read from the molecule's own file. A group contract lists what the GROUP emits;
//      `ml-record-form-table` emits 8 where its siblings emit 4, and `ml-inline-edit-table` emits five of
//      those through a DYNAMIC helper (`emitRowEvent(name, …)`) that a naive `CustomEvent('x'` scan misses.
//   3. WHAT IS NOT UNIVERSAL. An item every sibling has explains nothing. The useful answer is the
//      complement: what this one has that at least one sibling does not — and, just as important, WHICH
//      MOLECULES HAVE NOTHING OF THEIR OWN. Those are not broken: they are the ones that can only be told
//      apart by interaction, by the space they sit in, or by the shape of the data they are given, and a
//      static card will never do it. Six of groupViewTable's 13 are in that set.

export interface SyMoleculeSource {
  shortName: string;
  /** The molecule's own `.ts`. */
  ts: string;
  /** Its `.less`, when it has one. */
  less?: string;
  /** Its `.defs.ts`, for the `# Objective` line. */
  defs?: string;
}

export interface SyMoleculeFacts {
  shortName: string;
  tag: string;
  slots: string[];
  props: string[];
  events: string[];
  /** Attributes the molecule reads with `hasAttribute(...)` — the features that stay OFF until set. */
  switches: string[];
  /**
   * The `action="…"` verbs the molecule answers to, when it reads `getAttribute('action')`.
   *
   * ⚠️ NOT a `hasAttribute` switch, and that is exactly why it was missed. `ml-record-form-table` opens
   * its record form ONLY for `<RowAction action="open">` — and `open` is absent from the group usage.ts
   * vocabulary sentence, which also says "Never invent a name in this vocabulary". So the feature that
   * justifies choosing that molecule is unreachable from every document the model is given.
   */
  actions: string[];
  liveSlots: boolean;
  /** What makes it change shape on its own: a container query, a viewport media query, or neither. */
  reactsTo: 'container' | 'window' | 'none';
  objective: string;
}

export interface SyMoleculeDifferentiator extends SyMoleculeFacts {
  /** Items this molecule has that at least one sibling does not, rarest first. */
  exclusive: string[];
  /** On-switches only THIS molecule reads — the ones a showcase must set or the feature is invisible. */
  ownSwitches: string[];
}

export interface SyGroupDifferentiators {
  molecules: SyMoleculeDifferentiator[];
  /** Every event any molecule of the group emits. */
  allEvents: string[];
  /** On-switches read by exactly one molecule of the group. */
  distinguishingSwitches: string[];
  /** `action="…"` verbs exactly one molecule of the group answers to. */
  distinguishingActions: string[];
  /** Molecules with no exclusive slot/prop/event — they differ by behaviour, never by attribute. */
  withoutExclusiveApi: string[];
}

/** Attributes every molecule of the family reads; naming them as differentiators would be noise. */
const UNIVERSAL_SWITCHES = new Set(['is-editing', 'editing-rows', 'disabled', 'loading']);
/** Cap per molecule — the prompt must stay readable, and the rarest items carry the signal. */
const MAX_EXCLUSIVE = 8;

export function syExtractMoleculeFacts(source: SyMoleculeSource): SyMoleculeFacts {
  const ts = source.ts || '';
  const slotsMatch = ts.match(/slotTags\s*=\s*\[([\s\S]*?)\]/);
  const less = source.less || '';
  return {
    shortName: source.shortName,
    tag: (ts.match(/@customElement\(\s*'([^']+)'/) || [])[1] || '',
    slots: slotsMatch ? uniqueSorted(allMatches(slotsMatch[1], /'([^']+)'/g)) : [],
    props: uniqueSorted(allMatches(ts, /@propertyDataSource\([^)]*\)\s*(?:\r?\n\s*)?(?:declare\s+)?([A-Za-z_$][\w$]*)/g)),
    // Both spellings on purpose: a molecule may dispatch directly AND through a helper that takes the
    // event name as an argument — `ml-inline-edit-table` emits 5 of its 9 events only through the helper.
    events: uniqueSorted([
      ...allMatches(ts, /new CustomEvent\(\s*'([^']+)'/g),
      ...allMatches(ts, /\bemit[A-Za-z]*\(\s*'([^']+)'/g),
    ]),
    switches: uniqueSorted(allMatches(ts, /hasAttribute\(\s*'([^']+)'/g)).filter(name => !UNIVERSAL_SWITCHES.has(name)),
    actions: extractActionVocabulary(ts),
    liveSlots: /usesLiveSlots/.test(ts),
    reactsTo: /@container|container-type/.test(less) ? 'container' : /@media\s*\(/.test(less) ? 'window' : 'none',
    objective: firstSentence(source.defs || ''),
  };
}

export function syGroupDifferentiators(sources: SyMoleculeSource[]): SyGroupDifferentiators {
  const facts = sources.map(syExtractMoleculeFacts);
  const total = facts.length;
  const rarity = new Map<string, number>();
  const bump = (key: string) => rarity.set(key, (rarity.get(key) ?? 0) + 1);
  for (const f of facts) {
    for (const s of f.slots) bump(`slot:${s}`);
    for (const p of f.props) bump(`.${p}`);
    for (const e of f.events) bump(`@${e}`);
  }

  const molecules: SyMoleculeDifferentiator[] = facts.map(f => {
    const keys = [...f.slots.map(s => `slot:${s}`), ...f.props.map(p => `.${p}`), ...f.events.map(e => `@${e}`)];
    // NOT UNIVERSAL is the whole test: an item all N siblings carry cannot tell them apart. Rarest first,
    // so the model reads the sharpest difference at the top of each line.
    const exclusive = keys
      .filter(k => (rarity.get(k) ?? 0) < total)
      .sort((a, b) => (rarity.get(a) ?? 0) - (rarity.get(b) ?? 0) || a.localeCompare(b))
      .slice(0, MAX_EXCLUSIVE);
    const ownSwitches = f.switches.filter(sw => facts.filter(o => o.switches.includes(sw)).length === 1);
    return { ...f, exclusive, ownSwitches };
  });

  return {
    molecules,
    allEvents: uniqueSorted(facts.flatMap(f => f.events)),
    distinguishingSwitches: uniqueSorted(molecules.flatMap(m => m.ownSwitches)),
    distinguishingActions: uniqueSorted(
      uniqueSorted(facts.flatMap(f => f.actions)).filter(verb => facts.filter(f => f.actions.includes(verb)).length === 1),
    ),
    withoutExclusiveApi: molecules.filter(m => m.exclusive.length === 0).map(m => m.shortName),
  };
}

/** The block injected into the creation prompt. Plain text on purpose — it sits inside a markdown section. */
export function syRenderDifferentiators(group: SyGroupDifferentiators): string {
  if (!group.molecules.length) return '';
  const lines = group.molecules.map(m => {
    const parts: string[] = [];
    parts.push(m.liveSlots ? 'live slots (its slot content can BE a molecule)' : 'snapshot slots (slot content is read as text)');
    if (m.reactsTo !== 'none') {
      parts.push(m.reactsTo === 'container'
        ? 'changes shape by CONTAINER width (@container) — a narrow card demonstrates it'
        : 'has a WINDOW-width rule (@media) — a narrow CARD cannot trigger it; name the rule in the card instead of faking it');
    }
    parts.push(m.exclusive.length
      ? `only it (or few): ${m.exclusive.join(', ')}`
      : 'NO exclusive slot/property/event — it can only be told apart by interaction, by the space it sits in, or by the shape of its data');
    if (m.ownSwitches.length) parts.push(`turn it ON with: ${m.ownSwitches.map(s => `${s}="…"`).join(', ')}`);
    if (m.actions.length) parts.push(`answers to <RowAction action="…">: ${m.actions.join(', ')}`);
    return `- ${m.shortName} — ${parts.join(' · ')}\n    emits: ${m.events.join(', ') || '(none)'}\n    objective: ${m.objective || '(not declared)'}`;
  });

  const notes: string[] = [];
  if (group.withoutExclusiveApi.length) {
    notes.push(`${group.withoutExclusiveApi.length} of ${group.molecules.length} have NO exclusive API (${group.withoutExclusiveApi.join(', ')}). That is not a defect — it is the signal that a static card will never tell them apart from their siblings.`);
  }
  if (group.distinguishingActions.length) {
    notes.push(`\`action\` verbs exactly ONE molecule answers to — the feature they unlock has no other way in: ${group.distinguishingActions.join(', ')}.`);
  }
  if (group.distinguishingSwitches.length) {
    notes.push(`Attributes read by exactly ONE molecule of the group — the feature stays invisible until the showcase sets them: ${group.distinguishingSwitches.join(', ')}.`);
  }
  return [lines.join('\n'), notes.length ? `\n${notes.map(n => `⚠️ ${n}`).join('\n')}` : ''].filter(Boolean).join('\n');
}

/**
 * The `action="…"` verbs a molecule answers to. Read from the COMPARISONS, not from a declaration:
 * there is no list to read — the vocabulary only exists as `name === 'open'`, `action === 'save'` and
 * `case 'cancel'` inside the handler. Spacing varies between files (`action ==='cancel'` occurs), so
 * the pattern tolerates it.
 */
function extractActionVocabulary(ts: string): string[] {
  if (!/getAttribute\(\s*'action'\s*\)/.test(ts)) return [];
  return uniqueSorted([
    ...allMatches(ts, /(?:name|action)\s*===\s*'([a-z][\w-]*)'/g),
    ...allMatches(ts, /case\s*'([a-z][\w-]*)'/g),
  ]);
}

function allMatches(text: string, re: RegExp): string[] {
  return [...text.matchAll(re)].map(m => m[1]);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

/** The `# Objective` paragraph's first sentence — enough to place the molecule, short enough for a list. */
function firstSentence(defs: string): string {
  const body = (defs.match(/# Objective\s*\n([\s\S]*?)(?:\n#|$)/) || [])[1] || '';
  const flat = body.replace(/\s+/g, ' ').trim();
  const stop = flat.indexOf('. ');
  return (stop > 0 ? flat.slice(0, stop + 1) : flat).slice(0, 300);
}

/// <mls fileReference="_102020_/l2/aura/molecules/shared/usageContract.ts" enhancement="_blank"/>

// Detects whether a showcase page (index.ts) demonstrates the molecule's own contract, or only the
// mold's envelope — SHARED by every gate that judges an LLM-written showcase, so the three agents that
// import the same mold (skills/indexGroupPage.ts) cannot silently diverge on what counts as coverage.
// Do not reuse shared/contractFingerprint.ts for this — it is a hash of the contract text, not a parser.
//
// Measured on a real run (2026-09-04): a showcase for `groupTriggerAction` shipped with 6 instances of
// the button group and ZERO `data-variant` — the one property the usage skill calls "the only way to
// change how the button looks". The mold's own template (skills/indexGroupPage.ts:55-56) delivers a
// complete-looking, closed tag with no gap that asks for the molecule's properties, so the model never
// reaches for the usage skill's Properties/Events tables.

// What the mold's own template already provides (skills/indexGroupPage.ts:55-56).
// These say nothing about the molecule, so they do not count as contract coverage.
export const ENVELOPE = new Set(['name', 'value', 'isediting', 'change']);

function normalize(name: string): string {
  return name.toLowerCase().replace(/-/g, '');
}

/**
 * The contract items a group's usage skill documents, read from its `## Properties` and `## Events`
 * tables. Each row starts with `` | `name` `` — the backtick comes escaped in the source (`` \` ``)
 * because the skill text is a template literal. Normalized (lowercase, no hyphen) so `icon-position`
 * matches the `.iconPosition` binding a showcase page actually writes.
 */
export function usageContractItems(usageSkill: string): Set<string> {
  return new Set(parseContract(usageSkill).keys());
}

/**
 * The documented contract items a showcase does NOT demonstrate, in the spelling the usage skill
 * uses (`data-variant`, not the normalized `datavariant`) — the message of a failing gate quotes
 * these, so it must hand back names the model can type verbatim.
 *
 * Why it exists: sampling the normalized set fed the gate's own remediation advice two defects at
 * once. It suggested `datavariant` and `iconposition`, which are not attributes at all, and — for a
 * group whose contract overlaps the envelope, like `groupViewTable` — it suggested `value` and
 * `isediting`, items the page already carries. A gate that says "you used none, e.g. use `value`"
 * about a page holding `value` teaches the next error instead of the fix.
 */
export function contractItemsMissing(usageSkill: string, indexTs: string, group: string): string[] {
  const contract = parseContract(usageSkill);
  const used = new Set(contractItemsUsed(indexTs, group, new Set(contract.keys())));
  return [...contract.entries()]
    .filter(([key]) => !ENVELOPE.has(key) && !used.has(key))
    .map(([, spelling]) => spelling);
}

/** Normalized key -> the spelling the skill wrote, so a message can quote the real name. */
function parseContract(usageSkill: string): Map<string, string> {
  const items = new Map<string, string>();
  const text = usageSkill || '';
  for (const section of ['Properties', 'Events']) {
    const sectionMatch = text.match(new RegExp(`## ${section}([\\s\\S]*?)(?=\\n## |$)`));
    if (!sectionMatch) continue;
    for (const row of sectionMatch[1].matchAll(/^\|\s*\\?`([a-zA-Z][a-zA-Z0-9-]*)\\?`/gm)) {
      const key = normalize(row[1]);
      if (!items.has(key)) items.set(key, row[1]);
    }
  }
  return items;
}

/**
 * The contract items actually used on the group's molecule tags (`<{group}--{molecule} ...>`), outside
 * the mold's envelope. Attributes, property bindings (`.prop=`) and event bindings (`@event=`) all count
 * — the contract table does not distinguish how a member is bound.
 */
export function contractItemsUsed(indexTs: string, group: string, contract: Set<string>): string[] {
  const used = new Set<string>();
  // (?<!=) keeps an arrow function's `=>` inside an event handler (e.g. `@change=${(e) => {...}}`)
  // from being mistaken for the tag's own closing `>`, which would truncate the capture before a
  // later attribute (like a second event) ever gets read.
  const tagPattern = new RegExp(`<${group}--[a-z0-9-]+([\\s\\S]*?)(?<!=)>`, 'g');
  for (const tagMatch of (indexTs || '').matchAll(tagPattern)) {
    for (const attrMatch of tagMatch[1].matchAll(/(?:^|\s)[.@]?([a-zA-Z][a-zA-Z0-9-]*)\s*=/g)) {
      used.add(normalize(attrMatch[1]));
    }
  }
  return [...used].filter(item => contract.has(item) && !ENVELOPE.has(item));
}

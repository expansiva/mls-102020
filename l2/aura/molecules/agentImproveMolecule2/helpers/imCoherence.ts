/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imCoherence.ts" enhancement="_blank"/>

// The two coherence gates. PURE: takes source text, returns findings.
//
// REPORT ONLY — they never block (the decision, and why, in spec.md §8). An improve
// run is when these are cheapest to fix, so the report is an opportunity, not a barrier; blocking
// on pre-existing debt would freeze the agent on molecules nobody asked to repair.
//
// Both gates exist because of one week (2026-08-05/06) in which 13 defects of exactly these two
// shapes were found BY ACCIDENT, none by verification.

import { ImCoherenceFinding, ImCoherenceReport } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

/** `slotTags = ['Caption', 'TableHeader', …]` — the truth about what the molecule declares. */
export function readSlotTags(tsSource: string): string[] {
  const m = tsSource.match(/slotTags[^=]*=\s*\[([^\]]*)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Slot names the molecule's code actually READS, by any of the three paths. */
export function readSlotsUsed(tsSource: string): string[] {
  const used = new Set<string>();
  const re = /(?:getSlotContent|getSlot|getSlots|getSlotAttr|hasSlot|hasSlotContent|renderLiveSlot|getLiveSlot|getSlotClass)\('([^']+)'/g;
  for (const m of tsSource.matchAll(re)) used.add(m[1]);
  // renderLiveSlotFrom takes an ELEMENT, not a tag — the slot it projects is whichever one the
  // element came from, so it cannot be attributed by name here. Callers must treat a molecule
  // using it as "reads by element" and not report its slots as unused.
  return [...used];
}

/** True when the molecule projects by element, which makes per-name attribution impossible. */
export function usesElementProjection(tsSource: string): boolean {
  return /renderLiveSlotFrom\s*\(/.test(tsSource);
}

/** Slot names mentioned in the defs `skill` text. Deliberately loose: the defs is prose. */
export function readSlotsNamedInDefs(defsSource: string, candidates: string[]): string[] {
  const found: string[] = [];
  for (const tag of candidates) {
    const re = new RegExp(`\\b${tag}\\b`);
    if (re.test(defsSource)) found.push(tag);
  }
  return found;
}

/** Slot names the GROUP contract declares, from its creation skill text. */
export function readSlotTagsFromGroupSkill(creationSkill: string): string[] {
  const m = creationSkill.match(/slotTags\s*=\s*\[([^\]]*)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/**
 * GATE 1 — the defs must agree with the code and with the group contract.
 *
 * Catches the 2026-08-05 case: the .defs.ts of ml-lazy-record-detail-table described the PREVIOUS
 * design, omitted the `Detail` slot the code was already reading, and asserted "does not introduce
 * slots beyond the groupViewTable contract" while introducing one. Three errors in one file, and
 * nothing in the system noticed.
 */
export function gateDefsCoherence(
  defsSource: string,
  tsSource: string,
  groupCreationSkill: string,
  reference: string,
): ImCoherenceFinding[] {
  const findings: ImCoherenceFinding[] = [];
  const declared = readSlotTags(tsSource);
  if (declared.length === 0) return findings;

  const namedInDefs = readSlotsNamedInDefs(defsSource, declared);
  for (const tag of declared) {
    if (!namedInDefs.includes(tag)) {
      findings.push({
        gate: 'defs-x-slottags-x-contract',
        severity: 'preexisting',
        reference,
        message: `the code declares the slot '${tag}' and the .defs.ts never mentions it — the playground slot list is generated from the defs, so this produces a demo where '${tag}' is missing`,
      });
    }
  }

  const groupSlots = readSlotTagsFromGroupSkill(groupCreationSkill);
  if (groupSlots.length > 0) {
    for (const tag of declared) {
      if (!groupSlots.includes(tag)) {
        findings.push({
          gate: 'defs-x-slottags-x-contract',
          severity: 'preexisting',
          reference,
          message: `the slot '${tag}' is not in the group contract — either it belongs in the group's creation.ts, or the molecule should not declare it`,
        });
      }
    }
  }

  // The self-contradiction that hid the other two for weeks.
  const claimsNoNewSlots = /does not introduce slots/i.test(defsSource);
  const introduces = groupSlots.length > 0 && declared.some((t) => !groupSlots.includes(t));
  if (claimsNoNewSlots && introduces) {
    findings.push({
      gate: 'defs-x-slottags-x-contract',
      severity: 'preexisting',
      reference,
      message: `the .defs.ts states it introduces no slots beyond the group contract, and it does — the claim is false as written`,
    });
  }

  return findings;
}

/**
 * GATE 2 — every declared slot must actually be read by the code.
 *
 * MEASURED 2026-08-10: 32 molecules of mls-102040 declare a slot they never read (an earlier,
 * narrower sweep had said 9). groupentertext/ml-address-field declares Label, Helper, Prefix and
 * Suffix and reads NONE of them. Writing <Label> into them does nothing, silently.
 *
 * Two of those 8 carry the reason in a code comment — `'Trigger', // not used in table variant but
 * kept for contract` — so the finding is worded as a question, not an accusation: it may be
 * deliberate, and the user decides.
 */
export function gateDeclaredVsUsed(tsSource: string, reference: string): ImCoherenceFinding[] {
  const declared = readSlotTags(tsSource);
  if (declared.length === 0) return [];

  const used = readSlotsUsed(tsSource);
  const byElement = usesElementProjection(tsSource);

  return declared
    .filter((tag) => !used.includes(tag))
    .map((tag) => ({
      gate: 'declared-x-used' as const,
      severity: 'preexisting' as const,
      reference,
      message: byElement
        ? `the slot '${tag}' is declared and never read by name; this molecule also projects by element (renderLiveSlotFrom), so confirm it is reached that way — otherwise a consumer writing <${tag}> gets nothing, silently`
        : `the slot '${tag}' is declared and never read — a consumer writing <${tag}> gets nothing, silently. If that is deliberate ("kept for contract"), say so in a comment`,
    }));
}

/**
 * One line per SLOT, with the reasons merged.
 *
 * MEASURED on the first real run (2026-08-10): ml-address-field produced EIGHT findings for FOUR
 * slots — gate 1 fired on each ("the defs never mentions it") and gate 2 fired on each ("never
 * read"). Both were true, and the report read as noise. A report that reads as noise is ignored,
 * which defeats the point of having one.
 *
 * The merge is per slot and never wholesale, because the gates do NOT always co-occur: on
 * 2026-08-05 the `Detail` slot of ml-lazy-record-detail-table WAS read and only missing from the
 * contract, so only gate 1 fired. Merging everything would have hidden which of the two was wrong.
 */
export function groupFindingsBySlot(findings: ImCoherenceFinding[]): ImCoherenceFinding[] {
  const bySlot = new Map<string, ImCoherenceFinding[]>();
  const rest: ImCoherenceFinding[] = [];

  for (const finding of findings) {
    const slot = finding.message.match(/slot '([^']+)'/)?.[1];
    if (!slot) {
      rest.push(finding);
      continue;
    }
    const key = `${finding.reference}|${slot}`;
    const list = bySlot.get(key) || [];
    list.push(finding);
    bySlot.set(key, list);
  }

  const merged: ImCoherenceFinding[] = [];
  for (const [key, list] of bySlot) {
    if (list.length === 1) {
      merged.push(list[0]);
      continue;
    }
    const slot = key.split('|')[1];
    const undocumented = list.some(f => f.gate === 'defs-x-slottags-x-contract');
    const unread = list.some(f => f.gate === 'declared-x-used');
    merged.push({
      // Both gates produced it, so neither name alone is honest; the pair is reported under the
      // gate whose consequence is worse — a slot nothing reads.
      gate: unread ? 'declared-x-used' : 'defs-x-slottags-x-contract',
      // A finding this run introduced stays 'introduced' even when merged with a pre-existing one.
      severity: list.some(f => f.severity === 'introduced') ? 'introduced' : 'preexisting',
      reference: list[0].reference,
      message: undocumented && unread
        ? `the slot '${slot}' is fiction: the code declares it, the .defs.ts never mentions it, and nothing reads it. A consumer writing <${slot}> gets nothing, and the playground cannot even offer it. Either implement it or drop it from slotTags`
        : list.map(f => f.message).join(' — and '),
    });
  }

  return [...merged, ...rest];
}

/**
 * The report rendered by i7-summary.
 *
 * `previousTsSource` marks findings the CURRENT run introduced. v1 does not act differently on
 * them — everything is reported — but the distinction is recorded, because the moment it becomes
 * useful is the moment the agent starts writing incoherent artifacts of its own (flow.json
 * coherenceReport.notCovered).
 */
export function buildCoherenceReport(
  input: {
    defsSource: string;
    tsSource: string;
    groupCreationSkill: string;
    reference: string;
    previousTsSource?: string;
    previousDefsSource?: string;
  },
  now: string,
): ImCoherenceReport {
  const findings = groupFindingsBySlot([
    ...gateDefsCoherence(input.defsSource, input.tsSource, input.groupCreationSkill, input.reference),
    ...gateDeclaredVsUsed(input.tsSource, input.reference),
  ]);

  if (input.previousTsSource !== undefined && input.previousDefsSource !== undefined) {
    // O antes passa pelo MESMO agrupamento: sem isso as mensagens fundidas nunca casariam com as
    // separadas, e todo achado pré-existente seria reportado como introduzido por esta execução.
    const before = new Set(
      groupFindingsBySlot([
        ...gateDefsCoherence(input.previousDefsSource, input.previousTsSource, input.groupCreationSkill, input.reference),
        ...gateDeclaredVsUsed(input.previousTsSource, input.reference),
      ]).map((f) => `${f.gate}|${f.message}`),
    );
    for (const finding of findings) {
      if (!before.has(`${finding.gate}|${finding.message}`)) finding.severity = 'introduced';
    }
  }

  return { findings, checkedAt: now };
}

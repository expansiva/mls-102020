/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c2-molecules/gate.ts" enhancement="_blank"/>

// THE ANTI-INVENTION GATE (pure — unit-testable). The reason this probe exists at all.
//
// The failure mode being measured is a model that answers with a tag that sounds right and does not
// exist — and it is not hypothetical: the usage contracts' own examples carry 38 invalid tags against 2
// valid ones, across 29 of 31 groups (measured 2026-08-19). A run that produced such a tag
// would look like a success while pointing at nothing.
//
// So the only tags that pass are the ones the group PUBLISHES, spelled in full. Three distinct codes
// separate the ways a tag can be wrong, because the acceptance criterion is about one of them:
//
//   tag_invented — the tag does not exist in any spelling. This is the one that must stay at zero.
//   tag_short    — the molecule exists, the group prefix was dropped. Refused, never completed by code:
//                  copying the tag exactly is part of what the pilot measures (flow.json.decisions).
//   tag_case     — the molecule exists, the case is wrong. Refused, and counted apart: a slip is not
//                  an invention, and a report that conflated them would fail the wrong criterion.
//
// What this gate does NOT do is judge the CHOICE. Whether ml-combobox or ml-select-one-autocomplete was
// right for "type to filter, only values from the list" is exactly the tie the pilot is measuring, and a
// gate with an opinion about it would measure itself.

import {
  ChChoice,
  ChGateResult,
  chGateFail,
  chGateOk,
  chIsNone,
  chIssue,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

export interface ChChoiceOutput {
  region: string;
  group: string;
  tag: string;
  scenarioUsed: string;
  reason: string;
}

export interface ChMoleculesOutput {
  choices: ChChoiceOutput[];
}

export interface ChMoleculesInputs {
  output: ChMoleculesOutput;
  /** The group this call is about, in the catalog's spelling. */
  group: string;
  /** The region names c1 assigned to this group — all of them must be answered. */
  regions: string[];
  /** mod.molecules[].tag of this group: the only tags that exist. */
  tags: string[];
  /** mod.scenarios[].scenario of this group. */
  scenarios: string[];
}

export function normalizeChMoleculesOutput(result: Record<string, unknown>): ChMoleculesOutput {
  const raw = Array.isArray(result.choices) ? result.choices : [];
  const choices: ChChoiceOutput[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    choices.push({
      region: String(record.region ?? '').trim(),
      group: String(record.group ?? '').trim(),
      tag: String(record.tag ?? '').trim(),
      scenarioUsed: String(record.scenarioUsed ?? '').trim(),
      reason: String(record.reason ?? '').trim(),
    });
  }
  return { choices };
}

export function runChMoleculesGate(inputs: ChMoleculesInputs): ChGateResult {
  const { choices } = inputs.output;
  if (!choices.length) {
    return chGateFail(chIssue('choices_empty', `no choice was returned for ${inputs.group} — a region this group cannot serve is answered with tag 'none' and a reason, never by omission`));
  }

  const errors: string[] = [];
  const answered = new Set<string>();

  for (const [index, choice] of choices.entries()) {
    const where = choice.region || `choice #${index + 1}`;

    const region = matchRegion(choice.region, inputs.regions);
    if (!region) {
      errors.push(chIssue('region_unknown', `'${where}' is not one of the regions of this call (${inputs.regions.join(', ')}) — answer the regions as they were given, and do not add any`));
    } else if (answered.has(region)) {
      errors.push(chIssue('region_duplicated', `region '${region}' was answered twice — one molecule per region`));
    } else {
      answered.add(region);
    }

    if (choice.group && choice.group.trim().toLowerCase() !== inputs.group.toLowerCase()) {
      errors.push(chIssue('group_mismatch', `'${where}' names the group '${choice.group}', and this call is about ${inputs.group} — the other group's molecules are chosen in their own call`));
    }

    if (!choice.reason) {
      errors.push(chIssue('reason_missing', `'${where}' names no reason${chIsNone(choice.tag) ? " — and on 'none' the reason is the whole answer the reader gets" : ''}`));
    }

    if (!chIsNone(choice.scenarioUsed) && !inputs.scenarios.some(scenario => scenario.toLowerCase() === choice.scenarioUsed.toLowerCase())) {
      errors.push(chIssue('scenario_unknown', `'${where}' cites the scenario '${choice.scenarioUsed}', which is not a row of this group's quick-reference table — cite a row exactly, or answer 'none'`));
    }

    if (chIsNone(choice.tag)) continue;
    errors.push(...tagErrors(where, choice.tag, inputs));
  }

  for (const region of inputs.regions) {
    if (!answered.has(region)) {
      errors.push(chIssue('region_unanswered', `region '${region}' was given to this call and got no answer — if no molecule of ${inputs.group} serves it, say so with tag 'none' and a reason`));
    }
  }

  return errors.length ? chGateFail(...errors) : chGateOk();
}

/** The three ways a tag can be wrong. Returns at most one error per choice — the most specific. */
function tagErrors(where: string, tag: string, inputs: ChMoleculesInputs): string[] {
  if (inputs.tags.includes(tag)) return [];

  const byCase = inputs.tags.find(published => published.toLowerCase() === tag.toLowerCase());
  if (byCase) {
    return [chIssue('tag_case', `'${where}' spells the tag '${tag}' and the published tag is '${byCase}' — copy it exactly, character for character`)];
  }

  const bySuffix = inputs.tags.filter(published => published.toLowerCase().endsWith(`--${tag.toLowerCase()}`));
  if (bySuffix.length === 1) {
    return [chIssue('tag_short', `'${where}' answered '${tag}' without the group prefix — the published tag is '${bySuffix[0]}' and it is what has to be copied`)];
  }
  if (bySuffix.length > 1) {
    return [chIssue('tag_short', `'${where}' answered '${tag}' without the group prefix, and it matches more than one published tag: ${bySuffix.join(', ')} — copy one of them in full`)];
  }

  return [chIssue(
    'tag_invented',
    `'${where}' answered the tag '${tag}', which does not exist in ${inputs.group}. The molecules of this group are: ${inputs.tags.join(', ')}. Choose one of these, copied exactly, or answer 'none' when none of them serves the region`,
  )];
}

/** Case-insensitive: the join must survive a case slip, which says nothing about the catalog. */
function matchRegion(name: string, regions: string[]): string {
  const wanted = (name || '').trim().toLowerCase();
  if (!wanted) return '';
  return regions.find(region => region.toLowerCase() === wanted) || '';
}

/**
 * The choices as they are RECORDED: region and group in the spelling c1 and the catalog used, the
 * sentinels turned into null. Runs after the gate passed.
 */
export function buildChChoices(output: ChMoleculesOutput, inputs: { group: string; regions: string[] }): ChChoice[] {
  return output.choices.map(choice => ({
    region: matchRegion(choice.region, inputs.regions) || choice.region,
    group: inputs.group,
    tag: chIsNone(choice.tag) ? null : choice.tag,
    scenarioUsed: chIsNone(choice.scenarioUsed) ? null : choice.scenarioUsed,
    reason: choice.reason,
  }));
}

/** Gate codes that mean "a tag that does not exist was produced" — what report.json counts. */
export function chTagIssueCodes(errors: string[]): { invented: number; short: number; case: number } {
  const count = (code: string): number => errors.filter(error => error.startsWith(`${code}:`)).length;
  return { invented: count('tag_invented'), short: count('tag_short'), case: count('tag_case') };
}

/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c1-groups/gate.ts" enhancement="_blank"/>

// Gate for the GROUP choice (pure — unit-testable).
//
// What it can and cannot do. It CANNOT tell whether groupSelectOne was a better answer than
// groupViewTable for "compare four plans" — that is judgement, and measuring it is the whole point of
// the pilot. It CAN refuse the mechanically impossible: a group that the catalog does not publish, a
// region name that cannot be joined to the next step, an empty answer.
//
// ⚠️ 'none' IS NOT A FAILURE, and this is the check the pilot most cares about (battery case #10: a page
// with an upload and a chart). The pilot's level 1 publishes 6 of the 32 groups, so a region no listed
// group covers has exactly one honest answer. Refusing it here would teach the model to name the
// closest-looking group instead — the failure mode being measured.

import {
  ChGateResult,
  ChRegion,
  chCanonicalGroup,
  chGateFail,
  chGateOk,
  chIsNone,
  chIssue,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

export interface ChGroupsRegionOutput {
  region: string;
  need: string;
  group: string;
  reason: string;
}

export interface ChGroupsOutput {
  regions: ChGroupsRegionOutput[];
}

export interface ChGroupsInputs {
  output: ChGroupsOutput;
  /** mod.groups[].name of level 1 — the only list of groups that exists. */
  knownGroups: string[];
}

/** Everything is defaulted here so the gate reads one shape; the gate is what rejects. */
export function normalizeChGroupsOutput(result: Record<string, unknown>): ChGroupsOutput {
  const raw = Array.isArray(result.regions) ? result.regions : [];
  const regions: ChGroupsRegionOutput[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    regions.push({
      region: String(record.region ?? '').trim(),
      need: String(record.need ?? '').trim(),
      group: String(record.group ?? '').trim(),
      reason: String(record.reason ?? '').trim(),
    });
  }
  return { regions };
}

export function runChGroupsGate(inputs: ChGroupsInputs): ChGateResult {
  const { regions } = inputs.output;
  if (!regions.length) {
    return chGateFail(chIssue('regions_empty', 'no region was returned — every definition of a page has at least one interaction, and if none of them can be served the answer is a region with group "none"'));
  }

  const errors: string[] = [];
  const seen = new Set<string>();

  for (const [index, region] of regions.entries()) {
    const where = region.region || `region #${index + 1}`;

    if (!region.region) {
      errors.push(chIssue('region_missing', `region #${index + 1} has no name, and the name is what the next step answers against`));
    } else {
      const key = region.region.toLowerCase();
      // The join is by NAME (flow.json.conventions.regionJoin): two regions sharing one makes the
      // next step's answer ambiguous, and nothing downstream could tell which was meant.
      if (seen.has(key)) errors.push(chIssue('region_duplicated', `two regions are named '${region.region}' — the name is the key the next step answers against, so it must be unique`));
      seen.add(key);
    }

    if (!region.need) errors.push(chIssue('need_missing', `region '${where}' says nothing about what it has to do, and that line is ALL the next step sees of the page`));
    if (!region.reason) errors.push(chIssue('reason_missing', `region '${where}' names no reason${chIsNone(region.group) ? ' — and on "none" the reason is the whole answer the reader gets' : ''}`));

    if (chIsNone(region.group)) continue;
    if (!chCanonicalGroup(region.group, inputs.knownGroups)) {
      errors.push(chIssue(
        'group_unknown',
        `region '${where}' names the group '${region.group}', which this project does not publish. Choose one of: ${inputs.knownGroups.join(', ')} — or answer 'none' when none of them covers the region`,
      ));
    }
  }

  return errors.length ? chGateFail(...errors) : chGateOk();
}

/**
 * The regions as they are RECORDED, built after the gate passed: the group in the catalog's own
 * spelling, and the sentinel turned into null.
 *
 * Normalizing after the gate rather than inside it keeps the artifact honest about what will be done
 * while the trace keeps what the model actually said — the same split as i2-triage.
 */
export function buildChRegions(output: ChGroupsOutput, knownGroups: string[]): ChRegion[] {
  return output.regions.map(region => ({
    region: region.region,
    need: region.need,
    group: chIsNone(region.group) ? null : chCanonicalGroup(region.group, knownGroups) || null,
    reason: region.reason,
  }));
}

/** The distinct groups to fan out over, in the order they first appear. */
export function chDistinctGroups(regions: ChRegion[]): string[] {
  const out: string[] = [];
  for (const region of regions) {
    if (region.group && !out.includes(region.group)) out.push(region.group);
  }
  return out;
}

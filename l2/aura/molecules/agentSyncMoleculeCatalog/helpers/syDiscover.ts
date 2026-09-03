/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDiscover.ts" enhancement="_blank"/>

// Which groups the PROJECT actually has, matched against the manual skills/index.ts registry, and
// which of them the mention asked for. Pure — the I/O that feeds it (scanning mls.stor.files for
// molecule folders) lives in helpers/syFs.ts, the only module here that touches the disk.
//
// ⚠️ WHY DISCOVERY IS BY PROJECT DIRECTORY AND NOT BY skills/index.ts (analysis §4, decided 2026-08-25):
// resolveTargetGroups() in the legacy agentUpdateIndexGroupPage resolves against skills/index.ts, and
// that list is manually maintained and can drift from the project. Measured on 2026-08-25: the project
// has 32 group directories, skills/index.ts has 31 entries — 'groupNavigateMain' has a directory and a
// molecule with a .defs.ts, and it is INVISIBLE to the legacy agent, by name and by 'all'. Discovering
// from the directories fixes that for free; a group with no skills/index.ts entry is not skipped
// silently, it is IGNORED WITH A REASON (decision D4), because the reason is what the summary needs to
// say and what tells the human it is fixable (add the missing entry).

import { SyDiscoveredGroup, SyDiscoveryResult, SyIgnoredGroup } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

export interface SySkillListEntry {
  name: string;
  description: string;
  skillUsageReference: string;
}

const IGNORED_REASON = 'sem entrada em skills/index.ts — o agente não tem a frase de propósito do grupo e não pode inventá-la; adicione a entrada e rode de novo';

/**
 * One row per DISTINCT project folder, in the order `projectFolders` gives them — the caller (syFs)
 * scans and sorts alphabetically, so `matched`/`ignored` come back alphabetical by folder too.
 *
 * ⚠️ NOT skills/index.ts order — that was the first guess (a subsequence match against 4 of the 6 pilot
 * groups looked like it), and E5's regeneration falsified it: the seeded skill.ts lists 'groupViewTable'
 * BEFORE 'groupEnterDate', the opposite of their skills/index.ts order. The manually-maintained file's
 * order is not a rule to reverse-engineer; alphabetical is simple, deterministic and easy for a human to
 * predict when scanning the generated skill.ts.
 */
export function syDiscoverGroups(projectFolders: string[], skillList: SySkillListEntry[]): SyDiscoveryResult {
  const byName = new Map(skillList.map(entry => [entry.name.trim().toLowerCase(), entry]));
  const matched: SyDiscoveredGroup[] = [];
  const ignored: SyIgnoredGroup[] = [];
  const seen = new Set<string>();

  for (const raw of projectFolders) {
    const folder = (raw || '').trim().toLowerCase();
    if (!folder || seen.has(folder)) continue;
    seen.add(folder);

    const entry = byName.get(folder);
    if (!entry) {
      ignored.push({ folder, reason: IGNORED_REASON });
      continue;
    }
    matched.push({ folder, canonical: entry.name, purpose: entry.description, usageContract: entry.skillUsageReference });
  }

  return { matched, ignored };
}

export interface SyResolvedRequest {
  /** Groups the run will actually generate. */
  selected: SyDiscoveredGroup[];
  /** Explicitly named, but this project ignores them too — same reason as the batch case. */
  requestedButIgnored: SyIgnoredGroup[];
  /** Named in the mention, but no project folder (matched or ignored) answers to it. */
  unknown: string[];
}

/**
 * Filters a discovery down to what the mention asked for.
 *
 * A token that names an IGNORED group (today, 'groupNavigateMain') is not reported as unknown — it is
 * the same ignored-with-reason outcome an 'all' run would give it (decision D4: ignoring never depends
 * on how the group was named). Only a token matching NEITHER list is unknown, and the caller is
 * expected to refuse with it — same asymmetry as `resolveTargetGroups`, but scoped to real folders.
 */
export function syResolveRequested(discovery: SyDiscoveryResult, requested: { wantsAll: boolean; groupTokens: string[] }): SyResolvedRequest {
  if (requested.wantsAll) {
    return { selected: discovery.matched, requestedButIgnored: discovery.ignored, unknown: [] };
  }

  const selected: SyDiscoveredGroup[] = [];
  const requestedButIgnored: SyIgnoredGroup[] = [];
  const unknown: string[] = [];

  for (const token of requested.groupTokens) {
    const wanted = token.trim().toLowerCase();
    if (!wanted) continue;

    const foundMatched = discovery.matched.find(group => group.folder === wanted || group.canonical.toLowerCase() === wanted);
    if (foundMatched) {
      selected.push(foundMatched);
      continue;
    }
    const foundIgnored = discovery.ignored.find(group => group.folder === wanted);
    if (foundIgnored) {
      requestedButIgnored.push(foundIgnored);
      continue;
    }
    unknown.push(token);
  }

  return { selected, requestedButIgnored, unknown };
}

/** The readable refusal for unknown group names — names the valid ones, like the family precedent. */
export function syUnknownGroupsMessage(unknown: string[], discovery: SyDiscoveryResult): string {
  const valid = [...discovery.matched.map(group => group.canonical), ...discovery.ignored.map(group => group.folder)].sort((a, b) => a.localeCompare(b));
  return `grupo(s) desconhecido(s): ${unknown.join(', ')}. Grupos válidos: ${valid.join(', ')}`;
}

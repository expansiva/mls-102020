/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.ts" enhancement="_blank"/>

// Pure: aggregates what a run recorded (input.json + every s1/s2/s3 artifact) into report.json and the
// readable summary. No LLM call — a model writing this would be spending a call to describe what
// deterministic steps already measured (same reasoning as agentChooseMolecules' c3-report).
//
// The four obligations below are NOT stylistic — each traces to a measured defect (design record §8,
// §9.3): (1) what was written; (2) ignored groups WITH a reason, so D4 never reads as data loss;
// (3) index.ts status PER GROUP — migrated / created / migration failed / creation failed, so a run
// never silently skips a group's page; (4) that the catalog is written but NOT PUBLISHED — the two
// silent failures §9.3 measured (an unpublished catalog reads "Failed to fetch"; a published one with
// unsaved edits reads the OLD content, with no error at all).

import { SyGroupArtifact, SyIgnoredGroup, SyIndexTsArtifact, SyProjectArtifact, SyRunInput } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

export const SY_PUBLISH_WARNING =
  'o catálogo foi gravado no stor (editor), mas NÃO foi publicado — não existe API de publicação nesta plataforma (D5). ' +
  'Um consumidor fora do editor (await import()) ainda lê o catálogo anterior, e um projeto publicado com esta edição não salva lê o conteúdo ANTIGO, sem erro nenhum. Publique o projeto manualmente para que o catálogo valha.';
export interface SyRunReportGroup {
  canonical: string;
  folder: string;
  indexDefsFile: string;
  indexHtmlFile: string;
  moleculeCount: number;
  moleculesWithoutDefs: string[];
  scenarioCount: number;
  scenariosSource: SyGroupArtifact['scenariosSource'];
  /** Where the platform will serve index.defs.ts from — '' when it could not be cached. */
  cachedAs: string;
  /** Why it could not be cached. Non-empty means the group page will fail to import it. */
  cacheError: string;
}

export type SyIndexTsStatus = 'migrated' | 'migration-failed' | 'created' | 'creation-failed' | 'already-migrated';

export interface SyRunReportIndexTsGroup {
  canonical: string;
  folder: string;
  status: SyIndexTsStatus;
  /** Set when status is 'migration-failed' or 'creation-failed'. */
  reason?: string;
  /** Set when status is 'created' (E8b). */
  scenarioCount?: number;
  droppedScenarioNames?: string[];
}

export interface SyRunReport {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  project: number;
  written: {
    skillFile: string | null;
    groupCount: number;
    moleculeCount: number;
    groups: SyRunReportGroup[];
  };
  ignored: SyIgnoredGroup[];
  requestedButIgnored: SyIgnoredGroup[];
  unknown: string[];
  /** Set when the run generated nothing on purpose — bad syntax, unknown names, or no eligible group. */
  refusal: string | null;
  /** Every group name this project accepts in a mention — what makes `unknown` actionable. */
  validGroups: string[];
  indexTs: {
    requested: boolean;
    groups: SyRunReportIndexTsGroup[];
  };
  publish: {
    published: false;
    warning: string;
  };
}

export function buildSyRunReport(facts: {
  savedAt: string;
  runKey: string;
  project: number;
  input: SyRunInput;
  projectArtifact: SyProjectArtifact | null;
  groupArtifacts: SyGroupArtifact[];
  indexTsArtifacts: SyIndexTsArtifact[];
}): SyRunReport {
  const migrationSet = new Set(facts.input.indexTsMigrationGroups);
  const creationSet = new Set(facts.input.indexTsCreationGroups);
  const indexTsArtifactByCanonical = new Map(facts.indexTsArtifacts.map(artifact => [artifact.canonical, artifact]));

  const indexTsGroups: SyRunReportIndexTsGroup[] = facts.input.matchedGroups
    .map((canonical): SyRunReportIndexTsGroup => {
      const folder = canonical.trim().toLowerCase();
      if (creationSet.has(canonical)) {
        const artifact = indexTsArtifactByCanonical.get(canonical);
        if (artifact?.status === 'created') return { canonical, folder, status: 'created', scenarioCount: artifact.scenarioCount, droppedScenarioNames: artifact.droppedScenarioNames };
        // A group flagged for creation whose s3 step left no artifact (crashed) is reported the same as
        // one that reported failure — the run must never read as silently having skipped it.
        return { canonical, folder, status: 'creation-failed', reason: artifact?.reason || "o passo s3 não deixou artefato" };
      }
      if (migrationSet.has(canonical)) {
        const artifact = indexTsArtifactByCanonical.get(canonical);
        if (artifact?.status === 'migrated') return { canonical, folder, status: 'migrated' };
        // A group flagged for migration whose s3 step left no artifact (crashed) is reported the same
        // as one that reported failure — the run must never read as silently having skipped it.
        return { canonical, folder, status: 'migration-failed', reason: artifact?.reason || "o passo s3 não deixou artefato" };
      }
      return { canonical, folder, status: 'already-migrated' };
    })
    .sort((a, b) => a.folder.localeCompare(b.folder));

  return {
    schemaVersion: 1,
    savedAt: facts.savedAt,
    runKey: facts.runKey,
    project: facts.project,
    written: {
      skillFile: facts.projectArtifact?.skillFile || null,
      groupCount: facts.groupArtifacts.length,
      moleculeCount: facts.groupArtifacts.reduce((sum, g) => sum + g.moleculeShortTags.length, 0),
      groups: facts.groupArtifacts
        .map(g => ({
          canonical: g.canonical,
          folder: g.folder,
          indexDefsFile: g.indexDefsFile,
          indexHtmlFile: g.indexHtmlFile,
          moleculeCount: g.moleculeShortTags.length,
          moleculesWithoutDefs: g.moleculesWithoutDefs,
          scenarioCount: g.scenarioCount,
          scenariosSource: g.scenariosSource,
          cachedAs: g.cachedAs || '',
          cacheError: g.cacheError || '',
        }))
        .sort((a, b) => a.folder.localeCompare(b.folder)),
    },
    ignored: facts.input.ignoredGroups,
    requestedButIgnored: facts.input.requestedButIgnoredGroups,
    unknown: facts.input.unknownGroups,
    refusal: facts.input.refusal || null,
    // The names a mention MAY use. Without them an "I don't know that group" message is a dead end;
    // with them it is a correction the human can act on in one read.
    validGroups: (facts.input.catalogGroups || []).map(group => group.canonical || group.folder),
    indexTs: { requested: facts.input.includeIndexTsRequested, groups: indexTsGroups },
    publish: { published: false, warning: SY_PUBLISH_WARNING },
  };
}

const INDEX_TS_STATUS_LABEL: Record<SyIndexTsStatus, string> = {
  migrated: 'index.ts migrado (tabela agora vem do index.defs)',
  'migration-failed': 'index.ts NÃO migrado',
  created: 'index.ts criado (E8b)',
  'creation-failed': 'index.ts NÃO criado',
  'already-migrated': 'index.ts já estava migrado, nada a fazer',
};

export function renderSyRunSummary(report: SyRunReport): string {
  const lines: string[] = [];
  lines.push(`agentSyncMoleculeCatalog — run ${report.runKey} (mls-${report.project})`);
  lines.push('');
  if (report.refusal) {
    lines.push(`⚠️ Nada foi gerado: ${report.refusal}`);
    if (report.validGroups.length) {
      lines.push('');
      lines.push(`Grupos que este projeto aceita: ${report.validGroups.join(', ')}.`);
    }
    lines.push('');
    lines.push('Nenhum arquivo foi escrito — corrija a menção e rode de novo.');
    return lines.join('\n');
  }

  lines.push(`Gravado: ${report.written.skillFile || 'l2/molecules/skill.ts'} + ${report.written.groupCount} grupo(s), ${report.written.moleculeCount} molécula(s) no total.`);
  for (const group of report.written.groups) {
    const defsNote = group.moleculesWithoutDefs.length ? `, ${group.moleculesWithoutDefs.length} sem .defs.ts` : '';
    lines.push(`  - ${group.canonical}: ${group.moleculeCount} molécula(s)${defsNote}, ${group.scenarioCount} cenário(s) (${group.scenariosSource}) — ${group.indexDefsFile}`);
    // A module that is written and compiled but not CACHED fails only later, in the page, with a fetch
    // error — while the run looks successful. Say it here, where someone will read it.
    if (group.cacheError) lines.push(`    ⚠️ fora do cache (${group.cacheError}) — a página do grupo não vai conseguir importar molecules/scenarios`);
  }

  if (report.ignored.length || report.requestedButIgnored.length) {
    lines.push('');
    lines.push('Grupos ignorados (não geraram nada, e por quê):');
    for (const group of [...report.requestedButIgnored, ...report.ignored]) lines.push(`  - ${group.folder}: ${group.reason}`);
  }

  if (report.unknown.length) {
    lines.push('');
    lines.push(`Nomes não reconhecidos na menção: ${report.unknown.join(', ')}.`);
    if (report.validGroups.length) lines.push(`  Grupos que este projeto aceita: ${report.validGroups.join(', ')}.`);
  }

  lines.push('');
  lines.push('index.ts, por grupo:');
  for (const group of report.indexTs.groups) {
    const failureSuffix = (group.status === 'migration-failed' || group.status === 'creation-failed') && group.reason ? ` — ${group.reason}` : '';
    const createdSuffix = group.status === 'created' ? `, ${group.scenarioCount ?? 0} cenário(s)${group.droppedScenarioNames?.length ? `, ${group.droppedScenarioNames.length} nome(s) inventado(s) descartado(s)` : ''}` : '';
    lines.push(`  - ${group.canonical}: ${INDEX_TS_STATUS_LABEL[group.status]}${failureSuffix}${createdSuffix}`);
  }

  lines.push('');
  lines.push(`⚠️ Publicação: ${report.publish.warning}`);

  return lines.join('\n');
}

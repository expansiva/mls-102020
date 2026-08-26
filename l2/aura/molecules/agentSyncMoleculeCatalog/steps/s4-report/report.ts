/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.ts" enhancement="_blank"/>

// Pure: aggregates what a run recorded (input.json + every s1/s2/s3 artifact) into report.json and the
// readable summary. No LLM call — a model writing this would be spending a call to describe what
// deterministic steps already measured (same reasoning as agentChooseMolecules' c3-report).
//
// The four obligations below are NOT stylistic — each traces to a measured defect (design record §8,
// §9.3): (1) what was written; (2) ignored groups WITH a reason, so D4 never reads as data loss;
// (3) index.ts status PER GROUP — migrated / needs creation (not built, E8b) / migration failed, so a
// run never silently skips a group's page; (4) that the catalog is written but NOT PUBLISHED — the two
// silent failures §9.3 measured (an unpublished catalog reads "Failed to fetch"; a published one with
// unsaved edits reads the OLD content, with no error at all).

import { SyGroupArtifact, SyIgnoredGroup, SyIndexTsArtifact, SyProjectArtifact, SyRunInput } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

export const SY_PUBLISH_WARNING =
  'o catálogo foi gravado no stor (editor), mas NÃO foi publicado — não existe API de publicação nesta plataforma (D5). ' +
  'Um consumidor fora do editor (await import()) ainda lê o catálogo anterior, e um projeto publicado com esta edição não salva lê o conteúdo ANTIGO, sem erro nenhum. Publique o projeto manualmente para que o catálogo valha.';
export const SY_CREATION_NOT_BUILT =
  'criação de index.ts do zero (E8b) não está implementada nesta versão — o grupo segue sem página de demonstração até isso ser construído.';

export interface SyRunReportGroup {
  canonical: string;
  folder: string;
  indexDefsFile: string;
  indexHtmlFile: string;
  moleculeCount: number;
  moleculesWithoutDefs: string[];
  scenarioCount: number;
  scenariosSource: SyGroupArtifact['scenariosSource'];
}

export type SyIndexTsStatus = 'migrated' | 'migration-failed' | 'creation-needed' | 'already-migrated';

export interface SyRunReportIndexTsGroup {
  canonical: string;
  folder: string;
  status: SyIndexTsStatus;
  /** Set when status is 'migration-failed'. */
  reason?: string;
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
  indexTs: {
    requested: boolean;
    groups: SyRunReportIndexTsGroup[];
    creationNotBuilt: string;
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
      if (creationSet.has(canonical)) return { canonical, folder, status: 'creation-needed' };
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
        }))
        .sort((a, b) => a.folder.localeCompare(b.folder)),
    },
    ignored: facts.input.ignoredGroups,
    requestedButIgnored: facts.input.requestedButIgnoredGroups,
    unknown: facts.input.unknownGroups,
    indexTs: { requested: facts.input.includeIndexTsRequested, groups: indexTsGroups, creationNotBuilt: SY_CREATION_NOT_BUILT },
    publish: { published: false, warning: SY_PUBLISH_WARNING },
  };
}

const INDEX_TS_STATUS_LABEL: Record<SyIndexTsStatus, string> = {
  migrated: 'index.ts migrado (tabela agora vem do index.defs)',
  'migration-failed': 'index.ts NÃO migrado',
  'creation-needed': 'sem index.ts — precisa ser criado (E8b, não implementado)',
  'already-migrated': 'index.ts já estava migrado, nada a fazer',
};

export function renderSyRunSummary(report: SyRunReport): string {
  const lines: string[] = [];
  lines.push(`agentSyncMoleculeCatalog — run ${report.runKey} (mls-${report.project})`);
  lines.push('');
  lines.push(`Gravado: ${report.written.skillFile || 'l2/molecules/skill.ts'} + ${report.written.groupCount} grupo(s), ${report.written.moleculeCount} molécula(s) no total.`);
  for (const group of report.written.groups) {
    const defsNote = group.moleculesWithoutDefs.length ? `, ${group.moleculesWithoutDefs.length} sem .defs.ts` : '';
    lines.push(`  - ${group.canonical}: ${group.moleculeCount} molécula(s)${defsNote}, ${group.scenarioCount} cenário(s) (${group.scenariosSource}) — ${group.indexDefsFile}`);
  }

  if (report.ignored.length || report.requestedButIgnored.length) {
    lines.push('');
    lines.push('Grupos ignorados (não geraram nada, e por quê):');
    for (const group of [...report.requestedButIgnored, ...report.ignored]) lines.push(`  - ${group.folder}: ${group.reason}`);
  }

  if (report.unknown.length) {
    lines.push('');
    lines.push(`Nomes não reconhecidos na menção: ${report.unknown.join(', ')}.`);
  }

  lines.push('');
  lines.push('index.ts, por grupo:');
  for (const group of report.indexTs.groups) {
    const suffix = group.status === 'migration-failed' && group.reason ? ` — ${group.reason}` : '';
    lines.push(`  - ${group.canonical}: ${INDEX_TS_STATUS_LABEL[group.status]}${suffix}`);
  }
  if (report.indexTs.groups.some(group => group.status === 'creation-needed')) {
    lines.push(`  (${report.indexTs.creationNotBuilt})`);
  }

  lines.push('');
  lines.push(`⚠️ Publicação: ${report.publish.warning}`);

  return lines.join('\n');
}

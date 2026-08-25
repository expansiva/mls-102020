/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.ts" enhancement="_blank"/>

// Pure: aggregates what a run recorded (input.json + every s1/s2 artifact) into report.json and the
// readable summary. No LLM call — a model writing this would be spending a call to describe what
// deterministic steps already measured (same reasoning as agentChooseMolecules' c3-report).
//
// The four obligations below are NOT stylistic — each traces to a measured defect (design record §8,
// §9.3): (1) what was written; (2) ignored groups WITH a reason, so D4 never reads as data loss;
// (3) that index.ts was not touched and how to ask for it — this agent has no s3 yet (todo §9, "pare
// depois do E7"), so the answer is always the same, but staying silent about it would be exactly the
// "assumed nothing was wanted, said nothing" failure the family avoids; (4) that the catalog is written
// but NOT PUBLISHED — the two silent failures §9.3 measured (an unpublished catalog reads
// "Failed to fetch"; a published one with unsaved edits reads the OLD content, with no error at all).

import { SyGroupArtifact, SyIgnoredGroup, SyProjectArtifact, SyRunInput } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

export const SY_INDEX_TS_HOWTO = "para incluir o index.ts, mencione o agente com 'incluindo o arquivo index.ts' ou 'com todos os arquivos' depois dos grupos";
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
    touched: false;
    howToRequest: string;
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
}): SyRunReport {
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
    indexTs: { requested: facts.input.includeIndexTsRequested, touched: false, howToRequest: SY_INDEX_TS_HOWTO },
    publish: { published: false, warning: SY_PUBLISH_WARNING },
  };
}

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
  lines.push(
    report.indexTs.requested
      ? `index.ts: pedido na menção, mas esta versão do agente ainda não o gera (o passo s3 é trabalho futuro) — o catálogo acima foi gravado normalmente.`
      : `index.ts: não tocado nesta run. ${report.indexTs.howToRequest}.`,
  );

  lines.push('');
  lines.push(`⚠️ Publicação: ${report.publish.warning}`);

  return lines.join('\n');
}

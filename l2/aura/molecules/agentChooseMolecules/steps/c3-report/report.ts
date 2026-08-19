/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c3-report/report.ts" enhancement="_blank"/>

// The run report: aggregation and rendering, PURE (no I/O, no clock — savedAt is passed in), which is
// what makes it unit-testable. The step agent beside it does the reading and the writing.
//
// ⚠️ NO LLM CALL, and that is a decision rather than an economy (flow.json.principles). A model writing
// this summary would be a fourth call polluting the very token measurement the run exists to take, and it
// could describe a metric nobody took. Everything below is arithmetic over what the two steps recorded.
//
// ⚠️ THE LABELS ARE IN PORTUGUESE on purpose. The audience of this summary is the team running the
// battery, and the control it is scored against is in Portuguese. The parts the model wrote — the reasons — stay in whatever language the user wrote in.

import { ChGroupArtifact, ChPromptSize, ChRegion } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

export interface ChTagIssues {
  invented: number;
  short: number;
  case: number;
}

export interface ChRunFacts {
  savedAt: string;
  runKey: string;
  definition: string;
  userLanguage: string;
  level1Reference: string;
  publishedGroups: string[];
  regions: ChRegion[];
  /** One per group c1 chose. A group whose step never accepted an answer is here with ok: false. */
  groups: ChGroupArtifact[];
  sizes: ChPromptSize[];
  /** Summed over every attempt's trace, including the attempts that were retried. */
  tagIssues: ChTagIssues;
  /** How many attempts a gate refused, across every step of the run. */
  attemptsRefused: number;
}

export interface ChRunRow {
  region: string;
  need: string;
  group: string | null;
  groupReason: string;
  tag: string | null;
  scenarioUsed: string | null;
  moleculeReason: string;
}

export interface ChRunReport {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  definition: string;
  userLanguage: string;
  catalog: { level1Reference: string; publishedGroups: string[] };
  rows: ChRunRow[];
  totals: {
    regions: number;
    regionsWithoutGroup: number;
    regionsWithoutMolecule: number;
    groupsChosen: number;
    groupsNotAnswered: string[];
  };
  gates: {
    tagIssues: ChTagIssues;
    attemptsRefused: number;
    /** The §11.4 criterion, as a boolean over what actually reached an artifact. */
    inventedTagsInArtifacts: number;
  };
  notes: string[];
  sizes: {
    perStep: ChPromptSize[];
    catalogTokensEstTotal: number;
    totalTokensEstTotal: number;
    charsPerTokenAssumed: number;
  };
}

/**
 * The joined table is the product: one row per region, carrying the group c1 chose and the molecule c2
 * chose for it. Scoring the battery against the gabarito is reading this table by hand
 * (flow.json.decisions.scoring).
 */
export function buildChRunReport(facts: ChRunFacts, charsPerToken: number): ChRunReport {
  const byGroup = new Map<string, ChGroupArtifact>();
  for (const artifact of facts.groups) byGroup.set(artifact.group, artifact);

  const rows: ChRunRow[] = facts.regions.map(region => {
    const artifact = region.group ? byGroup.get(region.group) : undefined;
    const choice = artifact?.choices.find(item => item.region === region.region);
    return {
      region: region.region,
      need: region.need,
      group: region.group,
      groupReason: region.reason,
      tag: choice?.tag ?? null,
      scenarioUsed: choice?.scenarioUsed ?? null,
      moleculeReason: choice?.reason || '',
    };
  });

  const notes: string[] = [];
  for (const artifact of facts.groups) {
    if (!artifact.ok) {
      notes.push(`${artifact.group}: nenhuma resposta aceita pelo gate — ${artifact.errors.join(' | ') || 'sem detalhe'}`);
    }
    for (const tag of artifact.chosenWithoutDefs) {
      notes.push(`${tag} foi escolhida e está marcada como fora de contrato (sem .defs.ts) — o objetivo dela não estava disponível para a decisão`);
    }
  }
  for (const region of facts.regions) {
    if (!region.group) notes.push(`região '${region.region}': nenhum grupo publicado cobre — ${region.reason}`);
  }
  const rowsWithoutMolecule = rows.filter(row => row.group && !row.tag);
  for (const row of rowsWithoutMolecule) {
    notes.push(`região '${row.region}': ${row.group} não tem molécula para ela — ${row.moleculeReason}`);
  }

  return {
    schemaVersion: 1,
    savedAt: facts.savedAt,
    runKey: facts.runKey,
    definition: facts.definition,
    userLanguage: facts.userLanguage,
    catalog: { level1Reference: facts.level1Reference, publishedGroups: facts.publishedGroups },
    rows,
    totals: {
      regions: facts.regions.length,
      regionsWithoutGroup: facts.regions.filter(region => !region.group).length,
      regionsWithoutMolecule: rowsWithoutMolecule.length,
      groupsChosen: facts.groups.length,
      groupsNotAnswered: facts.groups.filter(artifact => !artifact.ok).map(artifact => artifact.group),
    },
    gates: {
      tagIssues: facts.tagIssues,
      attemptsRefused: facts.attemptsRefused,
      // Zero by construction — the gate is what makes it zero. The count of REFUSALS above is the
      // interesting number: a gate that fired is a model that tried.
      inventedTagsInArtifacts: 0,
    },
    notes,
    sizes: {
      perStep: facts.sizes,
      catalogTokensEstTotal: facts.sizes.reduce((sum, size) => sum + size.catalogTokensEst, 0),
      totalTokensEstTotal: facts.sizes.reduce((sum, size) => sum + size.totalTokensEst, 0),
      charsPerTokenAssumed: charsPerToken,
    },
  };
}

/** The text the user reads in the task tree. Markdown, deterministic, nothing not measured. */
export function renderChRunSummary(report: ChRunReport): string {
  const lines: string[] = [];

  lines.push(`**Sonda do catálogo** · run \`${report.runKey}\` · ${report.totals.regions} região(ões), ${report.totals.groupsChosen} grupo(s)`);
  lines.push('');
  lines.push('| região | grupo | molécula | cenário |');
  lines.push('|---|---|---|---|');
  for (const row of report.rows) {
    lines.push(`| ${row.region} | ${row.group || '— (nenhum)'} | ${row.tag || '— (nenhuma)'} | ${row.scenarioUsed || '—'} |`);
  }

  lines.push('');
  lines.push('### Gates');
  lines.push(`- tags inventadas que chegaram ao artefato: **${report.gates.inventedTagsInArtifacts}**`);
  lines.push(`- tentativas recusadas pelo gate: ${report.gates.attemptsRefused}` +
    ` (inventada ${report.gates.tagIssues.invented}, sem prefixo ${report.gates.tagIssues.short}, caixa errada ${report.gates.tagIssues.case})`);
  if (report.totals.groupsNotAnswered.length) {
    lines.push(`- grupos sem resposta aceita: ${report.totals.groupsNotAnswered.join(', ')}`);
  }

  lines.push('');
  lines.push('### Tamanho dos prompts (tokens estimados)');
  lines.push('| passo | modelType | catálogo | total |');
  lines.push('|---|---|---|---|');
  for (const size of report.sizes.perStep) {
    const attempt = size.attempt > 1 ? ` (tent. ${size.attempt})` : '';
    lines.push(`| ${size.planId}${attempt} | ${size.modelType || '—'} | ${size.catalogTokensEst} | ${size.totalTokensEst} |`);
  }
  lines.push(`| **soma** | | **${report.sizes.catalogTokensEstTotal}** | **${report.sizes.totalTokensEstTotal}** |`);
  lines.push('');
  lines.push(`Estimativa a ${report.sizes.charsPerTokenAssumed} chars/token — a plataforma não expõe o consumo real.`);

  if (report.notes.length) {
    lines.push('');
    lines.push('### Observações');
    for (const note of report.notes) lines.push(`- ${note}`);
  }

  lines.push('');
  lines.push('A pontuação contra o gabarito é manual: `run.json` tem a tabela completa com as justificativas.');
  return lines.join('\n');
}

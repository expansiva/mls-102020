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

import { ChCatalogVia, ChGroupArtifact, ChPromptSize, ChRegion, ChStepUsage } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

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
  /** Which rung of the read ladder answered for level 1. */
  level1Via: ChCatalogVia;
  /** Which project's catalog answered the run, how it was chosen, and what else was reachable. */
  catalogProject: number;
  catalogSelectedBy: string;
  candidates: number[];
  catalogWarnings: string[];
  publishedGroups: string[];
  regions: ChRegion[];
  /** One per group c1 chose. A group whose step never accepted an answer is here with ok: false. */
  groups: ChGroupArtifact[];
  sizes: ChPromptSize[];
  /** What each call actually cost, from the runtime trace. Absent for a step whose line was not there. */
  usage: Array<{ planId: string; attempt: number } & ChStepUsage>;
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
  catalog: {
    project: number;
    selectedBy: string;
    candidates: number[];
    level1Reference: string;
    publishedGroups: string[];
    level1Via: ChCatalogVia;
    groupsReadFromEditor: string[];
  };
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
  /**
   * What the calls cost, as the provider counted them — and the gap to what this agent assembled.
   *
   * The two numbers answer different questions and both belong here: the estimate sizes the CATALOG block,
   * which is what the three-level design is about; `inputTokensTotal` is what the run cost, and
   * `overheadFactor` is how much of it the platform adds on its own (Content Memory, tool schema, thread).
   */
  usage: {
    perStep: Array<{ planId: string; attempt: number } & ChStepUsage>;
    inputTokensTotal: number;
    outputTokensTotal: number;
    costUsdTotal: number;
    /** real input / estimated total, over the steps that reported usage. null when nothing reported. */
    overheadFactor: number | null;
    stepsNotMeasured: string[];
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
  // The discovery's warnings come first: "the chosen project is not a dependency" changes how every row
  // below should be read, so it cannot sit under the per-region notes.
  for (const warning of facts.catalogWarnings) notes.push(warning);
  if (facts.candidates.length > 1) {
    notes.push(`havia mais de um catálogo alcançável (${facts.candidates.join(', ')}) e este run usou o ${facts.catalogProject}`);
  }
  // Reading from the editor is a finding, not a detail: the choice is valid, but a consumer that is not
  // the editor sees only the published module and would have read nothing.
  const fromEditor = [
    ...(facts.level1Via === 'stor' ? ['nível 1'] : []),
    ...facts.groups.filter(artifact => artifact.catalogVia === 'stor').map(artifact => artifact.group),
  ];
  if (fromEditor.length) {
    notes.push(`catálogo lido do EDITOR (stor), não do módulo publicado: ${fromEditor.join(', ')} — a escolha vale, mas um consumidor fora do editor não teria lido nada; publicar o arquivo`);
  }
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
    catalog: {
      project: facts.catalogProject,
      selectedBy: facts.catalogSelectedBy,
      candidates: facts.candidates,
      level1Reference: facts.level1Reference,
      publishedGroups: facts.publishedGroups,
      level1Via: facts.level1Via,
      groupsReadFromEditor: facts.groups.filter(artifact => artifact.catalogVia === 'stor').map(artifact => artifact.group),
    },
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
    usage: buildUsage(facts),
  };
}

/** The real cost of the run, and the gap to the estimate. Only steps that reported usage are compared. */
function buildUsage(facts: ChRunFacts): ChRunReport['usage'] {
  const measured = new Set(facts.usage.map(item => `${item.planId}#${item.attempt}`));
  const estimatedForMeasured = facts.sizes
    .filter(size => measured.has(`${size.planId}#${size.attempt}`))
    .reduce((sum, size) => sum + size.totalTokensEst, 0);
  const inputTokensTotal = facts.usage.reduce((sum, item) => sum + item.inputTokens, 0);

  return {
    perStep: facts.usage,
    inputTokensTotal,
    outputTokensTotal: facts.usage.reduce((sum, item) => sum + item.outputTokens, 0),
    costUsdTotal: Math.round(facts.usage.reduce((sum, item) => sum + item.costUsd, 0) * 1e6) / 1e6,
    overheadFactor: estimatedForMeasured ? Math.round((inputTokensTotal / estimatedForMeasured) * 100) / 100 : null,
    stepsNotMeasured: facts.sizes
      .filter(size => !measured.has(`${size.planId}#${size.attempt}`))
      .map(size => `${size.planId} (tent. ${size.attempt})`),
  };
}

/** The text the user reads in the task tree. Markdown, deterministic, nothing not measured. */
export function renderChRunSummary(report: ChRunReport): string {
  const lines: string[] = [];

  lines.push(`**Sonda do catálogo** · run \`${report.runKey}\` · catálogo do projeto **${report.catalog.project}** (${report.catalog.selectedBy}) · ${report.totals.regions} região(ões), ${report.totals.groupsChosen} grupo(s)`);
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
  lines.push('### Prompts: o que a sonda monta × o que a chamada custou');
  lines.push('| passo | modelType | catálogo (est.) | montado (est.) | entrada (real) | US$ |');
  lines.push('|---|---|---|---|---|---|');
  for (const size of report.sizes.perStep) {
    const attempt = size.attempt > 1 ? ` (tent. ${size.attempt})` : '';
    const usage = report.usage.perStep.find(item => item.planId === size.planId && item.attempt === size.attempt);
    lines.push(`| ${size.planId}${attempt} | ${size.modelType || '—'} | ${size.catalogTokensEst} | ${size.totalTokensEst} | ${usage ? usage.inputTokens : '— não medido'} | ${usage ? usage.costUsd.toFixed(4) : '—'} |`);
  }
  lines.push(`| **soma** | | **${report.sizes.catalogTokensEstTotal}** | **${report.sizes.totalTokensEstTotal}** | **${report.usage.inputTokensTotal || '—'}** | **${report.usage.costUsdTotal ? report.usage.costUsdTotal.toFixed(4) : '—'}** |`);
  lines.push('');
  lines.push(`Estimativa a ${report.sizes.charsPerTokenAssumed} chars/token mede o que a sonda monta; a coluna real vem do trace do passo.` +
    (report.usage.overheadFactor ? ` A plataforma acrescenta o resto: **${report.usage.overheadFactor}×** o montado (Content Memory, schema da tool, contexto da thread).` : ''));

  if (report.notes.length) {
    lines.push('');
    lines.push('### Observações');
    for (const note of report.notes) lines.push(`- ${note}`);
  }

  lines.push('');
  lines.push('A pontuação contra o gabarito é manual: `report.json` tem a tabela completa com as justificativas.');
  return lines.join('\n');
}

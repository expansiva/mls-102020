/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxPageData.ts" enhancement="_blank"/>

/**
 * What the page really has to show, for the molecule prompts: the shared states (which data feeds which
 * organism) and the row types of the contract (the only fields a row has, as agentMaterializeL2 pages50 gives its
 * own prompt). Without it the model only sees the organism texts and the template, and picks molecules for data
 * the page does not return — e.g. a sparkline for a total that has no series (trendWall on tarefas/inicio_membro,
 * 22/10/2026).
 *
 * PURE — parsing only, no `mls.*`.
 */

import { parseL2Contract } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';

export interface GenomeUxPageDataState { id: string; source: string; description: string; organisms: string[] }

export interface GenomeUxPageData {
  /** The shared states, null when the shared defs is missing or unreadable. */
  states: GenomeUxPageDataState[] | null;
  /** The contract row types as TypeScript interfaces, null when the contract is missing or unreadable. */
  rowTypes: string | null;
}

/** The row types of a contract, each with its one-line JSDoc (what the row is), as the materializer prompts them. */
export function genomeUxRowTypes(contractSource: string): string {
  const { definition } = parseL2Contract(contractSource.replace(/\r\n/gu, '\n'));
  return definition.projections
    .map(item => `${item.jsdoc ? `/** ${item.jsdoc} */\n` : ''}export interface ${item.name} {\n${item.body}\n}`)
    .join('\n\n') || '(the contract declares no row type)';
}

/** The page data from the two sources; an unreadable source becomes null instead of failing the page. */
export function genomeUxPageData(contractSource: string | null, sharedSource: string | null): GenomeUxPageData {
  let rowTypes: string | null = null;
  if (contractSource !== null) {
    try { rowTypes = genomeUxRowTypes(contractSource); } catch { rowTypes = null; }
  }
  let states: GenomeUxPageDataState[] | null = null;
  if (sharedSource !== null) {
    try {
      states = Object.entries(parseL2Shared(sharedSource).definition.states)
        .map(([id, state]) => ({ id, source: state.source, description: state.description, organisms: [...state.organisms] }));
    } catch { states = null; }
  }
  return { states, rowTypes };
}

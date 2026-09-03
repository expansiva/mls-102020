/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2ProjectContext.ts" enhancement="_blank"/>

// The TARGET project's own declared facts (l5/project.json) — read, never inferred. Added specifically
// so c2 can disambiguate between locale-specific siblings of the same group (e.g. a BR-formatted vs a
// US-formatted money input) using a fact the project already states, instead of guessing from a field
// name or defaulting to 'none' just because the region's own need line says nothing about locale.
//
// Measured case (2026-09): groupEnterMoney publishes ml-currency-input (en-US) and ml-enter-money-br
// (pt-BR); with no locale signal, c2 correctly answered 'none' for a plain 'type: number' field rather
// than guess — the honest outcome the whole family is built around, but avoidable here because the
// target project (_102046_) already declares its language in l5/project.json.

import { NmFileInfo, isRecord, readStorText } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';

export function cm2ProjectFileInfo(targetProject: number): NmFileInfo {
  return { project: targetProject, level: 5, folder: '', shortName: 'project', extension: '.json' };
}

/** Best-effort: an unreadable or malformed l5/project.json yields [] — the prompt section is then
 * simply omitted (formatProjectContext), never padded with a guess. */
export async function readCm2ProjectLanguages(targetProject: number): Promise<string[]> {
  const raw = await readStorText(cm2ProjectFileInfo(targetProject), false);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.languages)) return [];
  return parsed.languages
    .filter(isRecord)
    .map(item => (typeof item.language === 'string' ? item.language.trim() : ''))
    .filter(Boolean);
}

/** '' when nothing is declared — the caller omits the section entirely rather than padding the prompt. */
export function formatProjectContext(languages: string[]): string {
  if (!languages.length) return '';
  return [
    '## Project context',
    '',
    `This project declares language(s): ${languages.join(', ')}. Use this fact — never a field name or a habit — to pick between locale-specific siblings (e.g. a BR-formatted vs a US-formatted input). The absence of a matching declared fact is itself a reason to answer 'none' rather than guess.`,
  ].join('\n');
}

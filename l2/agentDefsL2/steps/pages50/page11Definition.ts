/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/page11Definition.ts" enhancement="_blank"/>

import {
  D2_DEFINITION_VERSION,
  parseD2Definition,
  type D2DefinitionOrganism,
  type D2DefinitionPresentation,
  type D2DefinitionReference,
  type D2MoleculeChoice,
  type D2Page11DefinitionDocument,
  type D2ResolvableSymbol,
} from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import type { D2MoleculePublishedRole } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import { assertD2HeaderReference, d2Header } from '/_102020_/l2/agentDefsL2/helpers/d2Header.js';

export interface D2Page11DefinitionInput {
  pageId: string;
  device: 'desktop' | 'mobile';
  intent: string;
  sharedRef: D2DefinitionReference;
  references: D2DefinitionReference[];
  presentation: D2DefinitionPresentation;
  organisms: D2DefinitionOrganism[];
  selectedRoles: D2MoleculePublishedRole[];
  /** Declared symbols from the shared definition, contract, journeys and selected sources. */
  symbols: readonly D2ResolvableSymbol[];
  /** Exact shared capabilities for each organism, irrespective of device-specific prose or fields. */
  capabilityRefsByOrganism: ReadonlyMap<string, readonly D2DefinitionReference[]>;
}

const PROSCRIBED_LAYOUT = /```(?:html|css)|<\/?[A-Za-z][^>]*>|\b(?:display|grid-template|position)\s*:|\b(?:two|three|2|3)[ -]column\b/iu;

export function buildD2Page11DefinitionDocument(input: D2Page11DefinitionInput): D2Page11DefinitionDocument {
  const byId = new Map(input.organisms.map(item => [item.id, item]));
  if (byId.size !== input.organisms.length || !byId.size) throw new Error('D2_PAGE11_ORGANISMS_INVALID');
  for (const organism of input.organisms) {
    const expected = input.capabilityRefsByOrganism.get(organism.id);
    if (!expected) throw new Error(`D2_PAGE11_ORGANISM_UNKNOWN: ${organism.id}`);
    if (referenceSet(organism.capabilityRefs) !== referenceSet(expected)) throw new Error(`D2_PAGE11_CAPABILITY_COVERAGE: ${organism.id}`);
    if (PROSCRIBED_LAYOUT.test(organism.description)) throw new Error(`D2_PAGE11_LAYOUT_PRESCRIPTION: ${organism.id}`);
  }
  if (input.capabilityRefsByOrganism.size !== byId.size) throw new Error('D2_PAGE11_ORGANISM_COVERAGE');
  if (input.device === 'mobile' && !hasMobileWidthIntent(input.presentation.mobileWidthRef)) {
    throw new Error('D2_PAGE11_MOBILE_WIDTH_INTENT');
  }
  const moleculeRecommendations = input.selectedRoles.map(role => {
    if (role.device !== input.device || !byId.has(role.organismId)) throw new Error(`D2_PAGE11_ROLE_SCOPE: ${role.organismId}/${role.device}`);
    const choice = (option: D2MoleculePublishedRole['preferred']): D2MoleculeChoice => ({
      tag: option.tag,
      indexRef: { purpose: 'selected molecule catalog index', fileRef: option.indexReference },
      usageRef: { purpose: 'selected molecule usage contract', fileRef: option.usageContractReference },
      reason: option.reason,
    });
    return {
      organismRef: role.organismId,
      role: role.role,
      preferred: choice(role.preferred),
      ...(role.alternative ? { alternative: choice(role.alternative) } : {}),
    };
  });
  const document: D2Page11DefinitionDocument = {
    schemaVersion: D2_DEFINITION_VERSION,
    artifactType: 'page11',
    pageId: input.pageId,
    device: input.device,
    intent: input.intent,
    sharedRef: input.sharedRef,
    references: dedupeReferences(input.references),
    presentation: input.presentation,
    organisms: input.organisms,
    moleculeRecommendations,
  };
  return parseStrictPage11(document, input.symbols);
}

export function renderD2Page11DefinitionDocument(
  moduleName: string,
  document: D2Page11DefinitionDocument,
  symbols: readonly D2ResolvableSymbol[],
  project?: number,
): string {
  const checked = parseStrictPage11(document, symbols);
  if (!/^[a-z][A-Za-z0-9_-]*$/u.test(moduleName)) throw new Error('D2_PAGE11_MODULE_NAME');
  const path = `l2/${moduleName}/web/${checked.device}/page11/${checked.pageId}.defs.ts`;
  return `${d2Header(path, project)}\n\nexport const definition = ${JSON.stringify(checked, null, 2)} as const;\n`;
}

export function parseD2Page11DefinitionSource(
  source: string,
  symbols: readonly D2ResolvableSymbol[],
): D2Page11DefinitionDocument {
  const match = /^\/\/\/ <mls fileReference="(?:_[0-9]+_\/)?(l2\/[^"\n]+)" enhancement="_blank"\/>\n\nexport const definition = ([\s\S]*?) as const;\n$/u.exec(source);
  if (!match) throw new Error('D2_PAGE11_SOURCE_SHAPE');
  let value: unknown;
  try { value = JSON.parse(match[2]); } catch { throw new Error('D2_PAGE11_SOURCE_JSON'); }
  const document = parseStrictPage11(value, symbols);
  if (!match[1].endsWith(`/web/${document.device}/page11/${document.pageId}.defs.ts`)) throw new Error('D2_PAGE11_SOURCE_PATH');
  assertD2HeaderReference(source, match[1]);
  return document;
}

function parseStrictPage11(value: unknown, symbols: readonly D2ResolvableSymbol[]): D2Page11DefinitionDocument {
  const parsed = parseD2Definition(value, symbols).document;
  if (parsed.artifactType !== 'page11') throw new Error('D2_PAGE11_ARTIFACT_TYPE');
  for (const organism of parsed.organisms) if (PROSCRIBED_LAYOUT.test(organism.description)) {
    throw new Error(`D2_PAGE11_LAYOUT_PRESCRIPTION: ${organism.id}`);
  }
  if (parsed.device === 'mobile' && !hasMobileWidthIntent(parsed.presentation.mobileWidthRef)) {
    throw new Error('D2_PAGE11_MOBILE_WIDTH_INTENT');
  }
  return parsed;
}

function referenceSet(references: readonly D2DefinitionReference[]): string {
  const keys = references.map(ref => `${ref.fileRef}\0${ref.fragment ?? ''}`);
  if (new Set(keys).size !== keys.length) throw new Error('D2_PAGE11_REFERENCE_DUPLICATE');
  return keys.sort().join('\n');
}

function dedupeReferences(references: readonly D2DefinitionReference[]): D2DefinitionReference[] {
  return [...new Map(references.map(ref => [`${ref.fileRef}\0${ref.fragment ?? ''}`, ref])).values()];
}

function hasMobileWidthIntent(reference: D2DefinitionReference | undefined): boolean {
  return !!reference && ['390', '360', '430'].every(width => reference.purpose.includes(width));
}

/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/render.ts" enhancement="_blank"/>
import type { D2SharedDefinition, D2SharedPipelineItem } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { d2Header } from '/_102020_/l2/agentDefsL2/helpers/d2Header.js';
import { parseD2Definition, type D2ResolvableSymbol, type D2SharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import { D2_SHARED_DEFINITION_KEYS } from '/_102020_/l2/agentDefsL2/steps/shared40/definition.js';
export function renderD2Shared(definition: D2SharedDefinition, pipeline: D2SharedPipelineItem, project?: number): string {
  return `${d2Header(pipeline.defPath, project)}\n\nexport const definition = ${JSON.stringify(definition, null, 2)} as const;\n\nexport const pipeline = ${JSON.stringify([pipeline], null, 2)} as const;\n`;
}

export function parseD2RenderedShared(source: string): { definition: D2SharedDefinition; pipeline: D2SharedPipelineItem[] } {
  const definition = parseExport(source, 'definition');
  const pipeline = parseExport(source, 'pipeline');
  if (!definition || typeof definition !== 'object' || Array.isArray(definition) || !Array.isArray(pipeline)) throw new Error('D2_SHARED_CONSUMER_SHAPE');
  return { definition: definition as D2SharedDefinition, pipeline: pipeline as D2SharedPipelineItem[] };
}

function parseExport(source: string, name: string): unknown {
  const match = new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`).exec(source);
  if (!match) throw new Error(`D2_SHARED_EXPORT_MISSING: ${name}`);
  try { return JSON.parse(match[1]); } catch { throw new Error(`D2_SHARED_EXPORT_INVALID: ${name}`); }
}

export function renderD2SharedDefinitionDocument(document: D2SharedDefinitionDocument, project?: number): string {
  const contractPath = document.contractRef.fileRef;
  const defPath = contractPath.replace('/contracts/', '/shared/').replace(/\.defs\.ts$/u, '.defs.ts');
  return `${d2Header(defPath, project)}\n\nexport const definition = ${JSON.stringify(document, null, 2)} as const;\n`;
}

export function parseD2RenderedSharedDefinitionDocument(source: string, symbols: readonly D2ResolvableSymbol[]): D2SharedDefinitionDocument {
  const exports = [...source.matchAll(/export const\s+([A-Za-z0-9_]+)/gu)].map(match => match[1]);
  if (exports.join(',') !== 'definition') throw new Error('D2_SHARED_DEFINITION_RENDER_EXPORTS');
  const document = parseD2Definition(parseExport(source, 'definition'), symbols).document;
  if (document.artifactType !== 'shared' || Object.keys(document).join('\0') !== D2_SHARED_DEFINITION_KEYS.join('\0')) throw new Error('D2_SHARED_DEFINITION_SHAPE');
  const expectedPath = document.contractRef.fileRef.replace('/contracts/', '/shared/');
  const header = /^\/\/\/ <mls fileReference="(?:_[0-9]+_\/)?(l2\/[^"\n]+)" enhancement="_blank"\/>\n/u.exec(source);
  if (!header || header[1] !== expectedPath) throw new Error('D2_SHARED_DEFINITION_HEADER_OR_METADATA');
  return document;
}

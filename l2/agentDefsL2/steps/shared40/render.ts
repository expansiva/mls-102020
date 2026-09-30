/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/render.ts" enhancement="_blank"/>
import { d2Header } from '/_102020_/l2/agentDefsL2/helpers/d2Header.js';
import { parseD2Definition, type D2ResolvableSymbol, type D2SharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import { D2_SHARED_DEFINITION_KEYS } from '/_102020_/l2/agentDefsL2/steps/shared40/definition.js';
export function renderD2SharedDefinitionDocument(document: D2SharedDefinitionDocument, project?: number): string {
  const contractPath = document.contractRef.fileRef;
  const defPath = contractPath.replace('/contracts/', '/shared/').replace(/\.defs\.ts$/u, '.defs.ts');
  return `${d2Header(defPath, project)}\n\nexport const definition = ${JSON.stringify(document, null, 2)} as const;\n`;
}

export function parseD2RenderedSharedDefinitionDocument(source: string, symbols: readonly D2ResolvableSymbol[]): D2SharedDefinitionDocument {
  const match = /^\/\/\/ <mls fileReference="(?:_[0-9]+_\/)?(l2\/[^"\n]+)" enhancement="_blank"\/>\n\nexport const definition = ([\s\S]*?) as const;\n$/u.exec(source);
  if (!match) throw new Error('D2_SHARED_DEFINITION_RENDER_EXPORTS');
  let value: unknown;
  try { value = JSON.parse(match[2]); } catch { throw new Error('D2_SHARED_DEFINITION_RENDER_EXPORTS'); }
  const document = parseD2Definition(value, symbols).document;
  if (document.artifactType !== 'shared' || Object.keys(document).join('\0') !== D2_SHARED_DEFINITION_KEYS.join('\0')) throw new Error('D2_SHARED_DEFINITION_SHAPE');
  const expectedPath = document.contractRef.fileRef.replace('/contracts/', '/shared/');
  const header = /^\/\/\/ <mls fileReference="(?:_[0-9]+_\/)?(l2\/[^"\n]+)" enhancement="_blank"\/>\n/u.exec(source);
  if (!header || header[1] !== expectedPath) throw new Error('D2_SHARED_DEFINITION_HEADER_OR_METADATA');
  return document;
}

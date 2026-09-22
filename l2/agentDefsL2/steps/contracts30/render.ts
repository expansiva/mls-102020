/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/render.ts" enhancement="_blank"/>

import type { D2ContractCall, D2ContractField, D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';

export function renderD2PageContract(contract: D2PageContract): string {
  if (!contract.calls.length) return 'export {};\n';
  const lines: string[] = [];
  for (const call of contract.calls) {
    lines.push(`export const ${call.routeName} = ${JSON.stringify(call.route)} as const;`, '');
    renderInterface(lines, `${call.callPascal}Input`, call.input);
    if (call.outputShape === 'array') {
      renderInterface(lines, `${call.callPascal}Item`, call.output);
      lines.push(`export type ${call.callPascal}Output = ${call.callPascal}Item[];`, '');
    } else renderInterface(lines, `${call.callPascal}Output`, call.output);
  }
  return `${lines.join('\n').trim()}\n`;
}

function renderInterface(lines: string[], name: string, fields: D2ContractField[]): void {
  lines.push(`export interface ${name} {`);
  lines.push(...renderFields(fields, '  '));
  lines.push('}', '');
}

function renderFields(fields: D2ContractField[], indent: string): string[] {
  const lines: string[] = [];
  for (const field of fields) {
    const optional = field.required ? '' : '?';
    const key = JSON.stringify(field.name);
    let type = field.children.length ? `{\n${renderFields(field.children, `${indent}  `).join('\n')}\n${indent}}` : field.tsType;
    if (field.collection) type = `Array<${type}>`;
    lines.push(`${indent}${key}${optional}: ${type};`);
  }
  return lines;
}

export function assertD2RenderedContract(source: string, expected: D2PageContract): void {
  if (/\bany\b|\bunknown\b/.test(source)) throw new Error('D2_CONTRACT_RENDER_UNSAFE_TYPE');
  for (const call of expected.calls) {
    if (!source.includes(`export const ${call.routeName} = ${JSON.stringify(call.route)} as const;`)) throw new Error(`D2_CONTRACT_RENDER_ROUTE_MISSING: ${call.route}`);
    if (!source.includes(`export interface ${call.callPascal}Input`)) throw new Error(`D2_CONTRACT_RENDER_INPUT_MISSING: ${call.callName}`);
    if (!source.includes(`${call.callPascal}Output`)) throw new Error(`D2_CONTRACT_RENDER_OUTPUT_MISSING: ${call.callName}`);
  }
}

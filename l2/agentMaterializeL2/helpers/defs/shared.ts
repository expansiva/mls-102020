/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/shared.ts" enhancement="_blank"/>

// Reader of the public shared defs (web/shared/<pageId>.defs.ts). Grammar only, no policy.
// The format is the official one, `_102020_/l2/helpers/sharedV2/format.ts`, frozen by Wagner on 13/10/2026 ("o defs
// deve ter a intenção, do que deve ser feito, sem amarrar a LLM materializador"): entry.params (with `required`),
// requests, states (with the organisms they feed), journeys (step, organisms, continuesIn), rules (one list) and
// access. No `forms` and no `functions`: what each request does comes from the contract route comment, and who
// starts it from its trigger and from the page11 intents. Imported, not copied (13/10/2026), so this agent reads
// exactly what agentDefsL2 writes. The private copy it replaced also read `forms` and `functions`.

import { buildD2SharedV2, parseD2SharedV2, type D2SharedV2Definition, type D2SharedV2Journey, type D2SharedV2Request, type D2SharedV2State } from '/_102020_/l2/helpers/sharedV2/format.js';
import type { L2PageLocation } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';

export type L2SharedDefinition = D2SharedV2Definition;
export type L2SharedParam = D2SharedV2Definition['entry']['params'][string];
export type L2SharedRequest = D2SharedV2Request;
export type L2SharedState = D2SharedV2State;
export type L2SharedJourney = D2SharedV2Journey;

/** A state source, classified by the grammar of the shared. */
export type L2StateSource =
  | { kind: 'entryParam'; param: string }
  | { kind: 'requestInput'; request: string }
  | { kind: 'requestReturn'; request: string; key: string }
  | { kind: 'state'; state: string }
  | { kind: 'invalid' };

/** The official parser, after normalizing CRLF (the Studio may save the file with it) and the final newline. */
export function parseL2Shared(source: string): { location: L2PageLocation; definition: L2SharedDefinition } {
  return parseD2SharedV2(`${source.replace(/\r\n/gu, '\n').replace(/\n*$/u, '')}\n`);
}

export function buildL2Shared(value: unknown): L2SharedDefinition {
  return buildD2SharedV2(value);
}

export function classifyL2StateSource(source: string, definition: L2SharedDefinition): L2StateSource {
  if (source.startsWith('entry.params.')) {
    const param = source.slice('entry.params.'.length);
    return param && !param.includes('.') && definition.entry.params[param] ? { kind: 'entryParam', param } : { kind: 'invalid' };
  }
  const dot = source.indexOf('.');
  if (dot > 0) {
    const request = source.slice(0, dot);
    const tail = source.slice(dot + 1);
    const row = definition.requests[request];
    if (!row || !tail || tail.includes('.')) return { kind: 'invalid' };
    if (tail === 'input') return row.kind === 'cmd' ? { kind: 'requestInput', request } : { kind: 'invalid' };
    return row.returns.includes(tail) ? { kind: 'requestReturn', request, key: tail } : { kind: 'invalid' };
  }
  if (definition.states[source]) return { kind: 'state', state: source };
  return { kind: 'invalid' };
}

/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2WriteInput.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';

/**
 * What a write asks the person to type, read from the L4 ontology (d2_72):
 * - transition: the transition `payload`;
 * - create: required fields that are not `derived`, not the lifecycle state (an enum whose values are the
 *   `lifecycleStates`), not a sequence (`sequence.next` capability on a unique integer) and not a required foreign key
 *   (`relationships[].via`, filled from context or selection);
 * - update: whatever the page edits of the entity (decided by the page, not here).
 * Paths are entity-qualified (`Entity.path`).
 */
interface Field { type?: string; required?: boolean; derived?: boolean; unique?: boolean; values?: Array<{ value?: string }>; fields?: Record<string, Field> }
interface EntityView {
  record?: { fields?: Record<string, Field> };
  transitions?: Array<{ transitionId?: string; payload?: string[] }>;
  lifecycleStates?: Array<{ state?: string }>;
  capabilities?: Record<string, unknown>;
  relationships?: Record<string, { via?: string; required?: unknown }>;
}

export function d2TransitionPayload(entity: Ns5OntologyAnyEntity | undefined, entityId: string, transitionRef: string): string[] {
  const transition = (entity as EntityView | undefined)?.transitions?.find(item => item.transitionId === transitionRef);
  return (transition?.payload ?? []).map(path => path.startsWith(`${entityId}.`) ? path : `${entityId}.${path}`);
}

export function d2CreateRequiredInput(entity: Ns5OntologyAnyEntity | undefined, entityId: string): string[] {
  const view = entity as EntityView | undefined;
  if (!view?.record?.fields) return [];
  const states = new Set((view.lifecycleStates ?? []).map(item => item.state).filter(Boolean));
  const sequence = Boolean(view.capabilities?.['sequence.next']);
  const foreignKeys = new Set(Object.values(view.relationships ?? {})
    .filter(rel => (rel.required === true || (typeof rel.required === 'string' && rel.required.trim().length > 0)) && (rel.via ?? '').startsWith(`${entityId}.`))
    .map(rel => rel.via as string));
  const out: string[] = [];
  const walk = (fields: Record<string, Field>, prefix: string): void => {
    for (const [key, field] of Object.entries(fields)) {
      const path = `${prefix}.${key}`;
      if (field.fields) { walk(field.fields, path); continue; }
      if (!field.required || field.derived) continue;
      if (field.type === 'enum' && states.size && [...states].every(state => (field.values ?? []).some(item => item.value === state))) continue;
      if (sequence && field.unique && field.type === 'integer') continue;
      if (foreignKeys.has(path)) continue;
      out.push(path);
    }
  };
  walk(view.record.fields, entityId);
  return out;
}

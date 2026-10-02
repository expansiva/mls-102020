/// <mls fileReference="_102020_/l2/helpers/defsInput/writeKey.ts" enhancement="_blank"/>

/** A page write; a transition is identified by its transitionRef, never by the operation alone. */
export interface D2Write { entity: string; operation: string; transitionRef?: string }

/** The one key that matches a write in L2: `Entity.<transitionRef>` for a transition, `Entity.<operation>` otherwise. */
export function d2WriteKey(write: D2Write): string {
  if (write.operation === 'transition') {
    if (!write.transitionRef) throw new Error(`D2_WRITE_TRANSITION_WITHOUT_REF: ${write.entity}.transition has no transitionRef.`);
    return `${write.entity}.${write.transitionRef}`;
  }
  return `${write.entity}.${write.operation}`;
}

export function d2WriteByKey(writes: readonly D2Write[], key: string): D2Write | undefined {
  return writes.find(write => { try { return d2WriteKey(write) === key; } catch { return false; } });
}

/**
 * `Entity.transition` names no transition. With exactly one transition of that entity on the page it is that one;
 * with more, the answer lists the valid keys so a repair converges.
 */
export function d2NormalizeWriteKey(key: string, writes: readonly D2Write[]): string {
  const [entity, operation] = key.split('.');
  if (operation !== 'transition') return key;
  const transitions = writes.filter(write => write.entity === entity && write.operation === 'transition' && write.transitionRef);
  if (transitions.length === 1) return d2WriteKey(transitions[0]);
  throw new Error(`D2_PAGE11_TRANSITION_AMBIGUOUS: ${key} names no transition; use one of ${transitions.map(d2WriteKey).join(', ') || '(none on this page)'}.`);
}

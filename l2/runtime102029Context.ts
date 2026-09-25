/// <mls fileReference="_102020_/l2/runtime102029Context.ts" enhancement="_blank"/>

export const CONTRACTS_102029: readonly string[] = [
  '_102029_/l2/stateLitElement.ts',
  '_102029_/l2/collabLitElement.ts',
  '_102029_/l2/bffClient.ts',
  '_102029_/l2/collabState.ts',
  '_102029_/l2/interactionRuntime.ts',
];

export function expandContextRef(ref: string): string[] {
  return ref === '_102029_.d.ts' ? [...CONTRACTS_102029] : [ref];
}

export interface Ns4E2FastContext {
  task?: { iaCompressed?: { longMemory?: Record<string, unknown> } };
}

export function isNs4E2FastMode(context: Ns4E2FastContext): boolean {
  return context.task?.iaCompressed?.longMemory?.fastMode === 'true';
}

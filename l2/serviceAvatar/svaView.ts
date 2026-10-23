/// <mls fileReference="_102020_/l2/serviceAvatar/svaView.ts" enhancement="_blank"/>

// What the floating chat shows for a task (pure: no engine imports, node-testable).
//   thinking -> the agent is working (LLM, BFF); text = the step running now
//   waiting  -> a clarification is pending: the chat mounts it (options, fields, answer + OK)
//   done     -> finished; text = the last result the agent wrote
//   failed   -> finished with an error; text = the reason when the task carries one

export type SvaViewKind = 'thinking' | 'waiting' | 'done' | 'failed';

export interface SvaView {
  kind: SvaViewKind;
  text: string;
  stepId: number;   // waiting: the clarification to mount; 0 otherwise
}

interface StepLike {
  stepId: number;
  type: string;
  status: string;
  stepTitle?: string;
  traceMsg?: string;
  result?: unknown;
  nextSteps?: StepLike[] | null;
  interaction?: { payload?: StepLike[] | null; trace?: unknown } | null;
}

interface TaskLike {
  status: string;
  iaCompressed?: { nextSteps?: StepLike[] | null } | null;
}

export function allSteps(task: TaskLike): StepLike[] {
  const out: StepLike[] = [];
  const queue: StepLike[] = [...(task.iaCompressed?.nextSteps || [])];
  while (queue.length) {
    const step = queue.shift() as StepLike;
    out.push(step);
    queue.push(...(step.nextSteps || []), ...(step.interaction?.payload || []));
  }
  return out;
}

const OPEN_CLARIFICATION = new Set(['pending', 'in_progress']);
const CLOSED = new Set(['completed', 'failed']);

export function taskView(task: TaskLike): SvaView {
  const steps = allSteps(task);
  // step ids grow as the task grows: the highest one is the most recent
  const latest = <T extends StepLike>(items: T[]): T | undefined => items.reduce<T | undefined>((best, item) => (!best || item.stepId > best.stepId ? item : best), undefined);

  if (task.status === 'done') {
    const result = latest(steps.filter(step => step.type === 'result' && step.status === 'completed'));
    return { kind: 'done', text: (result?.stepTitle || '').trim(), stepId: 0 };
  }
  if (task.status === 'failed') {
    const failed = latest(steps.filter(step => step.status === 'failed'));
    return { kind: 'failed', text: (failed?.traceMsg || failed?.stepTitle || '').trim(), stepId: 0 };
  }
  const clarification = latest(steps.filter(step => step.type === 'clarification' && OPEN_CLARIFICATION.has(step.status)));
  if (clarification) return { kind: 'waiting', text: '', stepId: clarification.stepId };
  const working = latest(steps.filter(step => step.type === 'agent' && !CLOSED.has(step.status)));
  return { kind: 'thinking', text: (working?.stepTitle || '').trim(), stepId: 0 };
}

/// <mls fileReference="_102020_/l2/aura/helpers/taskManager.ts" enhancement="_blank" />

// ─── Types ───────────────────────────────────────────────────────────

// 'queued': waiting for its turn in a batch (e.g. one task per module, run in sequence).
export type TaskStatus = 'queued' | 'running' | 'done' | 'error';

export interface ITask {
    status: TaskStatus;
    startedAt: number;
    message?: string;
    messageId?: string;
    taskId?: string;
    taskData?: any;
    taskMessage?: any;
}

// ─── Module-level store ───────────────────────────────────────────────
// Lives outside any component — survives DOM re-creation between knob navigations.

const _store = new Map<string, ITask>();
const _listeners = new Set<() => void>();

// ─── Write ───────────────────────────────────────────────────────────

export function setTask(key: string, task: ITask): void {
    _store.set(key, task);
    _listeners.forEach(fn => fn());
}

// ─── Read ─────────────────────────────────────────────────────────────

export function getTask(key: string): ITask | undefined {
    return _store.get(key);
}

export function getTasksByScope(scope: string): Map<string, ITask> {
    const prefix = `${scope}:`;
    const result = new Map<string, ITask>();
    _store.forEach((task, key) => { if (key.startsWith(prefix)) result.set(key, task); });
    return result;
}

export function hasRunning(scope: string): boolean {
    return [...getTasksByScope(scope).values()].some(t => t.status === 'running');
}

/** A batch is busy while any of its tasks is running or still waiting for its turn. */
export function hasPending(scope: string): boolean {
    return [...getTasksByScope(scope).values()].some(t => t.status === 'running' || t.status === 'queued');
}

// ─── Subscription ────────────────────────────────────────────────────
// Returns an unsubscribe function. Call it in disconnectedCallback.

export function clearScope(scope: string): void {
    const prefix = `${scope}:`;
    [..._store.keys()].forEach(key => { if (key.startsWith(prefix)) _store.delete(key); });
    _listeners.forEach(fn => fn());
}

export function subscribeTaskManager(listener: () => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
}

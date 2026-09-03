/// <mls fileReference="_102020_/l2/aura/agentManagePage2/trace.ts" enhancement="_blank" />

// Console tracing for the agentManagePage2 flow. Answers three questions at a glance: WHICH agent is
// running, WHAT was sent to the model, and WHAT came back — including the deterministic verdicts
// (guards, compile, validation) that happen after the model answers.
//
// Every line is prefixed `[amp2 <agent> · <page>]` so a run can be filtered in the browser console
// with a single term, and prompts/payloads go inside collapsed groups so the log stays readable until
// you open the one you care about.
//
// Turn it off at runtime with `window.__amp2Trace = false` (or setTrace(false)); no rebuild needed.

export interface TraceMeta {
    /** Agent doing the work — the one you want to see in the log. */
    agent: string;
    page?: string;
    /** Distinguishes concurrent runs in the same console. */
    taskId?: string;
    /** Patch/repair round, when the agent has one. */
    attempt?: number;
}

/** Characters of a single prompt/payload we print before truncating. */
const MAX_TEXT = 24_000;

let enabled = true;

export function setTrace(value: boolean): void {
    enabled = value;
}

export function isTraceOn(): boolean {
    const flag = (globalThis as Record<string, unknown>)['__amp2Trace'];
    return flag === undefined ? enabled : flag !== false;
}

function prefix(meta: TraceMeta): string {
    const page = meta.page ? ` · ${meta.page}` : '';
    const attempt = meta.attempt && meta.attempt > 1 ? ` · attempt ${meta.attempt}` : '';
    const task = meta.taskId ? ` · #${meta.taskId.slice(-6)}` : '';
    return `[amp2 ${meta.agent}${page}${attempt}${task}]`;
}

function sizeOf(value: unknown): string {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
    const chars = text ? text.length : 0;
    return chars >= 1024 ? `${(chars / 1024).toFixed(1)}KB` : `${chars}B`;
}

function clamp(text: string): string {
    return text.length <= MAX_TEXT ? text : `${text.slice(0, MAX_TEXT)}\n… [truncated, ${text.length - MAX_TEXT} more chars]`;
}

/** console.groupCollapsed is not guaranteed outside the browser (node tests, workers). */
function group(header: string, body: () => void): void {
    const console_ = console as unknown as Record<string, ((...args: unknown[]) => void) | undefined>;
    const open = console_['groupCollapsed'] ?? console_['group'];
    if (typeof open !== 'function') { console.info(header); body(); return; }
    open.call(console, header);
    try { body(); } finally { console_['groupEnd']?.call(console); }
}

/** A milestone: what the agent is about to do, or just did. */
export function traceStep(meta: TraceMeta, label: string, detail?: Record<string, unknown>): void {
    if (!isTraceOn()) return;
    const summary = detail ? ` ${Object.entries(detail).map(([k, v]) => `${k}=${format(v)}`).join(' ')}` : '';
    console.info(`${prefix(meta)} ▶ ${label}${summary}`);
}

function format(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.length ? `[${value.join(', ')}]` : '[]';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/** The files the agent read, and which resolution tier answered. */
export function traceSources(meta: TraceMeta, sources: Record<string, { ref: string; found: boolean; size?: number; via?: string }>): void {
    if (!isTraceOn()) return;
    group(`${prefix(meta)} 📄 sources`, () => {
        for (const [name, info] of Object.entries(sources)) {
            const size = info.size ? ` ${info.size >= 1024 ? `${(info.size / 1024).toFixed(1)}KB` : `${info.size}B`}` : '';
            const via = info.via ? ` (${info.via})` : '';
            console.info(`${info.found ? '✓' : '✗'} ${name}${size}${via}: ${info.ref}`);
        }
    });
}

/** What went to the model. `data` is the structured payload behind a JSON human prompt. */
export function traceSent(meta: TraceMeta, label: string, sent: { system?: string; human?: string; tool?: string; data?: unknown }): void {
    if (!isTraceOn()) return;
    const parts: string[] = [];
    if (sent.system) parts.push(`system ${sizeOf(sent.system)}`);
    if (sent.human) parts.push(`human ${sizeOf(sent.human)}`);
    if (sent.tool) parts.push(`tool ${sent.tool}`);
    group(`${prefix(meta)} ⇧ SENT · ${label} (${parts.join(', ')})`, () => {
        if (sent.data !== undefined) console.info('data:', sent.data);
        if (sent.system) console.info(`--- system prompt ---\n${clamp(sent.system)}`);
        if (sent.human) console.info(`--- human prompt ---\n${clamp(sent.human)}`);
    });
}

/** What came back from the model, raw. */
export function traceReceived(meta: TraceMeta, label: string, payload: unknown, summary?: Record<string, unknown>): void {
    if (!isTraceOn()) return;
    const head = summary ? ` ${Object.entries(summary).map(([k, v]) => `${k}=${format(v)}`).join(' ')}` : '';
    group(`${prefix(meta)} ⇩ RECEIVED · ${label} (${sizeOf(payload)})${head}`, () => {
        console.info('payload:', payload);
        const text = typeof payload === 'string' ? payload : safeJson(payload);
        if (text) console.info(`--- raw ---\n${clamp(text)}`);
    });
}

function safeJson(value: unknown): string {
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

/** A deterministic verdict after the model answered: guard, compile, validation. */
export function traceVerdict(meta: TraceMeta, label: string, ok: boolean, detail?: string): void {
    if (!isTraceOn()) return;
    const line = `${prefix(meta)} ${ok ? '✓' : '✗'} ${label}${detail ? `: ${detail}` : ''}`;
    if (ok) console.info(line); else console.warn(line);
}

/** The run ended badly. Always logged, trace on or off — a failure is never noise. */
export function traceFail(meta: TraceMeta, reason: string): void {
    console.error(`${prefix(meta)} ✗ ${reason}`);
}

/** The steps this agent just created — the shape of the run that follows. */
export function tracePlan(meta: TraceMeta, steps: Array<{ planId: string; agent: string; dependsOn?: string[] }>): void {
    if (!isTraceOn()) return;
    const summary = steps.map(step => `${step.planId}→${step.agent}${step.dependsOn?.length ? ` (after ${step.dependsOn.join(', ')})` : ''}`);
    console.info(`${prefix(meta)} ⇨ steps: ${summary.join(' | ')}`);
}

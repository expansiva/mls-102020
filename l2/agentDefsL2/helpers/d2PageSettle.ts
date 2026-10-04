/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2PageSettle.ts" enhancement="_blank"/>

/**
 * A stage that runs one worker per page (bff55, shared60) ends only when every page of this task is accepted or
 * refused; then it passes or fails once. A refused page is recorded where its receipt lives and does not stop its
 * siblings (d2_64).
 */
export interface D2PageRefusal {
  schemaVersion: string;
  project: number;
  module: string;
  pageId: string;
  taskId: string;
  diagnostic: string;
}

export interface D2PageSettlePort {
  pageIds(): Promise<string[] | null>;
  reusable(pageId: string): Promise<boolean>;
  refusal(pageId: string): Promise<D2PageRefusal | null>;
}

export type D2PageSettlement =
  | { state: 'pending'; pending: string[] }
  | { state: 'ready'; pageIds: string[] }
  | { state: 'refused'; refusals: D2PageRefusal[] };

export async function settleD2Pages(taskId: string, port: D2PageSettlePort, missingCode: string): Promise<D2PageSettlement> {
  const ids = await port.pageIds();
  if (!ids) throw new Error(missingCode);
  const refusals: D2PageRefusal[] = [];
  const pending: string[] = [];
  for (const pageId of ids) {
    if (await port.reusable(pageId)) continue;
    const refusal = await port.refusal(pageId);
    // A refusal left by an earlier task is not this run's answer: the page is being redone.
    if (refusal && refusal.taskId === taskId) refusals.push(refusal);
    else pending.push(pageId);
  }
  if (pending.length) return { state: 'pending', pending };
  if (refusals.length) return { state: 'refused', refusals };
  return { state: 'ready', pageIds: ids };
}

export function d2PagesRefusedMessage(code: string, refusals: readonly D2PageRefusal[]): string {
  return `${code}: ${refusals.map(row => `${row.pageId}: ${row.diagnostic}`).join(' || ')}`;
}

/** The tool arguments of one answer, whatever envelope the host used. */
export function d2ToolPayload(value: unknown, name: string, code: string): unknown {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const candidate = root.type === 'flexible' ? (root.result as Record<string, unknown>)?.arguments : root.arguments ?? root.payload ?? root;
  if (root.type === 'flexible' && (root.result as Record<string, unknown>)?.toolName !== name) throw new Error(`${code}_TOOL_MISMATCH`);
  if (typeof candidate !== 'string') return candidate;
  try { return JSON.parse(candidate); } catch { throw new Error(`${code}_TOOL_JSON`); }
}

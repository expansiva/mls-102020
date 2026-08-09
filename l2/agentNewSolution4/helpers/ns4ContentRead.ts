/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4ContentRead.ts" enhancement="_blank"/>

export interface Ns4ReadableFile {
  versionRef?: unknown;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent: () => Promise<unknown>;
}

export interface Ns4ContentReadResult {
  text: string | null;
  unavailableNewFile: boolean;
}

/** Local-first content resolution that never sends the unsaved versionRef=0 to a remote driver. */
export async function readNs4AvailableContent(file: Ns4ReadableFile, extension: string): Promise<Ns4ContentReadResult> {
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      const localText = ns4ContentText(local?.content, extension);
      if (localText !== null) return { text: localText, unavailableNewFile: false };
    } catch { /* fall through to a committed remote version */ }
  }
  if (String(file.versionRef || '').trim() === '0') return { text: null, unavailableNewFile: true };
  return { text: ns4ContentText(await file.getContent(), extension), unavailableNewFile: false };
}

function ns4ContentText(content: unknown, extension: string): string | null {
  if (typeof content === 'string') return content;
  if (extension === '.json' && typeof content === 'object' && content !== null) {
    return `${JSON.stringify(content, null, 2)}\n`;
  }
  return null;
}

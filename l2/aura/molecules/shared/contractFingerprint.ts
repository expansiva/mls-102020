/// <mls fileReference="_102020_/l2/aura/molecules/shared/contractFingerprint.ts" enhancement="_blank"/>

// Fingerprint of a group contract (`creation.ts` / `usage.ts`) — SHARED by every agent that loads
// one, so a trace records WHICH version the runtime actually served.
//
// Why it exists: the contracts are imported by reference (`await import(...)`), so what an agent
// reads is the module the Studio SERVES, not the `.ts` on disk. Editing the source without
// publishing changes nothing, and a broken import degrades to an empty string in silence. Without a
// fingerprint in the trace there is no way, afterwards, to tell which text produced a given run —
// which is exactly what the analysis of 2026-08-25 needed and did not have.
//
// The hash is FNV-1a over the UTF-8 bytes: pure, dependency-free, and identical in the browser
// runtime and in node, so a build script can print the same pair for a working copy and comparing it
// against a trace is a string equality. It answers "is this the same text?", not "is this text
// trustworthy" — a 32-bit hash is a version tag, not a checksum.

export interface ContractFingerprint {
  /** Character count — the same unit the contract's size budget is measured in. */
  chars: number;
  /** FNV-1a of the UTF-8 bytes, 8 hex digits. Empty text yields the offset basis. */
  hash: string;
}

export function contractFingerprint(text: string): ContractFingerprint {
  const bytes = new TextEncoder().encode(text || '');
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    // 32-bit FNV prime multiply without overflowing into float precision
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return { chars: (text || '').length, hash: hash.toString(16).padStart(8, '0') };
}

/** One-line form for a summary or a log: `19.487 chars · a1b2c3d4`. */
export function fingerprintLabel(print: ContractFingerprint): string {
  return `${print.chars} chars · ${print.hash}`;
}

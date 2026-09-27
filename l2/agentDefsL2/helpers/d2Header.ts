/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Header.ts" enhancement="_blank"/>

export function d2Header(reference: string, project?: number): string {
  const ref = reference.replace(/^\//u, '');
  if (!/^(?:_[0-9]+_\/)?l2\/[A-Za-z0-9_/-]+\.defs\.ts$/u.test(ref)) throw new Error(`D2_HEADER_REFERENCE_INVALID: ${reference}`);
  const resolved = project && !ref.startsWith('_') ? `_${project}_/${ref}` : ref;
  return `/// <mls fileReference="${resolved}" enhancement="_blank"/>`;
}

export function assertD2Header(source: string, reference: string, project?: number): string {
  const lines = source.split('\n');
  if (lines[0] !== d2Header(reference, project) || lines.slice(1).some(line => /^\s*\/\/\/\s*<mls\b/u.test(line))) throw new Error(`D2_HEADER_INVALID: ${reference}`);
  return lines.slice(1).join('\n');
}

export function assertD2HeaderReference(source: string, reference: string): string {
  const project = /^\/\/\/ <mls fileReference="_(\d+)_\//u.exec(source);
  return assertD2Header(source, reference, project ? Number(project[1]) : undefined);
}

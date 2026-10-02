/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3MlsHeader.ts" enhancement="_blank"/>

export function applyHeader(outputPath: string, code: string): string {
  const header = mlsHeaderForOutputPath(outputPath);
  const trimmed = code.trimStart();
  const existingHeader = /^\/\/\/\s*<mls\b[^>]*\/>\s*/;
  if (existingHeader.test(trimmed)) return trimmed.replace(existingHeader, `${header}\n\n`);
  return `${header}\n\n${trimmed}`;
}

export function mlsHeaderForOutputPath(outputPath: string): string {
  return `/// <mls fileReference="${outputPath}" enhancement="${headerEnhancementForOutputPath(outputPath)}"/>`;
}

export function headerEnhancementForOutputPath(outputPath: string): string {
  if (/^_\d+_\/l2\/[^/]+\/web\/shared\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  if (/^_\d+_\/l2\/[^/]+\/web\/(?:desktop|mobile)\/page\d+\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  return '_blank';
}

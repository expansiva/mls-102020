/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4TypedDefs.ts" enhancement="_blank"/>

import { normalizeNs4ModuleName } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import type {
  Ns4PermanentArtifactByType,
  Ns4PermanentArtifactTypeName,
} from '/_102020_/l2/agentNewSolution/types.js';

const NS4_TYPES_IMPORT = '/_102020_/l2/agentNewSolution/types.js';

export interface Ns4DefsFileReference {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

export function renderNs4TypedDefsSource<T extends Ns4PermanentArtifactTypeName>(
  fileInfo: Ns4DefsFileReference,
  exportName: string,
  value: NoInfer<Ns4PermanentArtifactByType[T]>,
  artifactType: T,
): string {
  const safeExportName = normalizeNs4ModuleName(exportName);
  const exactTypeName = `${safeExportName.slice(0, 1).toUpperCase()}${safeExportName.slice(1)}Type`;
  return `/// <mls fileReference="_${fileInfo.project}_/l${fileInfo.level}/${fileInfo.folder}/${fileInfo.shortName}${fileInfo.extension}" enhancement="_blank"/>\n\n`
    + `import type { ${artifactType} } from '${NS4_TYPES_IMPORT}';\n\n`
    + `export const ${safeExportName} = ${JSON.stringify(value, null, 2)} as const satisfies ${artifactType};\n\n`
    + `export type ${exactTypeName} = typeof ${safeExportName};\n\n`
    + `export default ${safeExportName};\n`;
}

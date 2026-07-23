/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.ts" enhancement="_blank"/>

// Origin-molecule analysis: ref parsing, portal detection, class-name and
// ml-* inventory extraction. Pure string functions (unit-testable); the only
// stor access is loadOriginSources via the injected reader.

export interface VOriginRef {
  project: number;
  group: string;        // folder name, lowercase (e.g. 'grouptriggeraction')
  shortName: string;    // e.g. 'ml-button-standard'
  tag: string;          // e.g. 'grouptriggeraction--ml-button-standard'
  importPath: string;   // e.g. '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js'
}

// Accepts the molecule reference in the shapes both invocation paths send:
//  - collab-messages: '_102040_/l2/molecules/<group>/<shortName>'
//  - preview `page`:  '_102040_molecules/<group>/<shortName>' (no /l2/ segment)
//  - preview `fullName`: '_102040_/l2/molecules/<group>/ <shortName>' (stray spaces)
// Normalization mirrors the platform-canonical one used by agentImproveMolecule
// (insert /l2/ after the project token). Optional leading '/' and '.ts' suffix.
// Canonical-form normalizer, shared by the agent entry (so the rootPlan and
// task memory hold the clean ref) and parseOriginRef (idempotent). Mirrors the
// platform normalization used by agentImproveMolecule.
export function normalizeOriginPage(page: string): string {
  return (page || '')
    .replace(/\s+/g, '')                       // preview fullName carries stray spaces
    .replace(/^\//, '')
    .replace(/\.ts$/, '')
    .replace(/^(_\d+_)(?!\/l2\/)/, '$1/l2/');  // insert /l2/ when missing (preview page)
}

export function parseOriginRef(page: string): { ref: VOriginRef | null; error?: string } {
  const cleaned = normalizeOriginPage(page);
  const match = cleaned.match(/^_(\d+)_\/l2\/molecules\/([a-z0-9]+)\/([a-z0-9-]+)$/);
  if (!match) {
    return { ref: null, error: `invalid origin reference '${page}' — expected '_<project>_/l2/molecules/<group>/<molecule>' (a molecule of a dependency project)` };
  }
  const project = Number(match[1]);
  const group = match[2];
  const shortName = match[3];
  return {
    ref: {
      project,
      group,
      shortName,
      tag: `${group}--${shortName}`,
      importPath: `/_${project}_/l2/molecules/${group}/${shortName}.js`,
    },
  };
}

export function detectPortal(originTs: string): boolean {
  return /getPortalTemplate\s*\(|portalWidgetName/.test(originTs);
}

export function extractOriginClassName(originTs: string): string | null {
  const match = originTs.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  return match ? match[1] : null;
}

// The ml-* semantic class inventory: union of occurrences in the origin .ts
// (emitted by render()) and .less (styled selectors). This is the discipline
// gate input AND the v3-less subset check universe.
export function extractMlInventory(originTs: string, originLess: string): string[] {
  const found = new Set<string>();
  const pattern = /(?<![\w-])ml-[a-z][a-z0-9-]*/g;
  for (const source of [originTs, originLess]) {
    for (const match of source.matchAll(pattern)) found.add(match[0]);
  }
  return Array.from(found).sort();
}

// ml-* classes REFERENCED as selectors in a generated .less.
export function extractMlClassesFromLess(less: string): string[] {
  const found = new Set<string>();
  for (const match of less.matchAll(/\.(ml-[a-z][a-z0-9-]*)/g)) found.add(match[1]);
  return Array.from(found).sort();
}

// 'ml-button-standard' -> 'BUTTON STANDARD' (shell header title convention — fase 0 finding).
export function toShellTitle(shortName: string): string {
  return shortName.replace(/^ml-/, '').split('-').join(' ').toUpperCase();
}

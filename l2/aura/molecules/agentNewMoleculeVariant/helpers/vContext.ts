/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.ts" enhancement="_blank"/>

// The context artifact contract (l4/agentVariant/<shortName>/context.json).
// Written ONCE by v1-bootstrap; every later step reads it from disk and never
// re-derives. Pure types + summary helper.

import { VThemeInfo } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTheme.js';

export interface VariantContext {
  schemaVersion: 1;
  createdAt: string;
  userNotes: string;
  origin: {
    ref: string;             // '_102040_/l2/molecules/<group>/<shortName>'
    project: number;
    group: string;           // lowercase folder
    groupCanonical: string;  // e.g. 'groupTriggerAction' (skills index name; falls back to folder)
    shortName: string;
    tag: string;
    className: string;
    importPath: string;
    portal: boolean;
    mlClassInventory: string[];
  };
  theme: {
    project: number;         // == destination project
    ref: string;             // '_<proj>_/l2/skills/theme'
    info: VThemeInfo;
  };
  variant: {
    shortName: string;       // '<origin shortName><suffix>'
    tag: string;             // '<origin tag><suffix>'
    className: string;       // '<OriginClass><PascalTheme>'
    group: string;           // same folder name, in the destination project
    files: { ts: string; defs: string; less: string; html: string }; // display paths
  };
  example: {
    pattern: 'simple' | 'portal';
    ref: string | null;      // matching theme example ref (null => cold start)
    coldStart: boolean;
  };
  userLanguage: string;
}

export function variantContextSummary(ctx: VariantContext): string {
  return `${ctx.origin.tag} -> ${ctx.variant.tag} (${ctx.theme.info.name}${ctx.origin.portal ? ', portal' : ''}${ctx.example.coldStart ? ', COLD START' : ''})`;
}

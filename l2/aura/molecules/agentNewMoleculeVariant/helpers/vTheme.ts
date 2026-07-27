/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTheme.ts" enhancement="_blank"/>

// Theme loading + Variant-specific theme helpers. The contract v1 types +
// validator now live in the SHARED module (l2/aura/molecules/shared/vThemeContract);
// re-exported here so existing importers of this file keep working unchanged.

export type { VThemeBackground, VThemeInfo, VThemeExample, VTheme } from '/_102020_/l2/aura/molecules/shared/vThemeContract.js';
export { V_THEME_SKILL_SECTIONS, validateVThemeModule } from '/_102020_/l2/aura/molecules/shared/vThemeContract.js';

import { VTheme, validateVThemeModule } from '/_102020_/l2/aura/molecules/shared/vThemeContract.js';

// Loads the destination project's l2/skills/theme.ts. Returns errors instead of
// throwing so the bootstrap gate can report readable admission failures.
export async function loadVTheme(project: number): Promise<{ theme: VTheme | null; errors: string[] }> {
  const path = `/_${project}_/l2/skills/theme.js`;
  let mod: unknown;
  try {
    mod = await import(path);
  } catch {
    return { theme: null, errors: [`project ${project} has no theme skill (expected l2/skills/theme.ts) — this agent only runs inside a themed project`] };
  }
  return validateVThemeModule(mod);
}

export function pascalCaseThemeName(name: string): string {
  return name.replace(/(^|[-_ ])([a-z0-9])/g, (_m, _sep, ch: string) => ch.toUpperCase());
}

// The theme's Visual Signature section ('## 1 ..' up to '## 2. Tokens') — the
// chrome-styling guidance shared by the demo (v5) and the group index (v4).
// Falls back to the whole skill when the sections are absent.
export function extractVisualSignature(skill: string): string {
  const start = skill.indexOf('## 1. Visual Signature');
  const end = skill.indexOf('## 2. Tokens');
  if (start >= 0 && end > start) return skill.slice(start, end).trim();
  return skill.trim();
}

// Loads the destination theme skill and returns its Visual Signature section.
export async function loadThemeSignature(project: number): Promise<string> {
  const mod = await import(`/_${project}_/l2/skills/theme.js`) as { skill?: unknown };
  return extractVisualSignature(typeof mod.skill === 'string' ? mod.skill : '');
}

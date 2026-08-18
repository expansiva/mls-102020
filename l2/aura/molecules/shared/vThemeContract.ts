/// <mls fileReference="_102020_/l2/aura/molecules/shared/vThemeContract.ts" enhancement="_blank"/>

// Theme contract v1 — SHARED validator + types. Single source of truth for the
// l2/skills/theme.ts contract, consumed by every agent that reads or writes a
// theme (agentNewMoleculeVariant, agentNewTheme, and a future Improve Theme).
// Pure (unit-testable under node:test). THIS FILE IS THE CONTRACT: the types below and the
// validator are v1, and a theme.ts is valid exactly when it passes here.

export interface VThemeBackground {
  kind: 'light' | 'dark' | 'image';
  css: string;
  note: string;
}

export interface VThemeInfo {
  name: string;
  suffix: string;
  displayName: string;
  description: string;
  background: VThemeBackground;
}

export interface VThemeExample {
  pattern: 'simple' | 'portal';
  ref: string;
}

export interface VTheme {
  themeInfo: VThemeInfo;
  skill: string;
  examples: VThemeExample[];
}

export const V_THEME_SKILL_SECTIONS = [
  '## 1. Visual Signature',
  '## 2. Tokens',
  '## 3. Canonical CSS Rules',
] as const; // '## 4. Theme Nuances' is optional by contract

export function validateVThemeModule(mod: unknown): { theme: VTheme | null; errors: string[] } {
  const errors: string[] = [];
  const record = (typeof mod === 'object' && mod !== null) ? mod as Record<string, unknown> : null;
  if (!record) return { theme: null, errors: ['theme module is not an object'] };

  const info = record.themeInfo as Record<string, unknown> | undefined;
  if (!info || typeof info !== 'object') errors.push('missing export themeInfo');
  else {
    for (const field of ['name', 'suffix', 'displayName', 'description'] as const) {
      if (typeof info[field] !== 'string' || !(info[field] as string).trim()) errors.push(`themeInfo.${field} missing or empty`);
    }
    if (typeof info.suffix === 'string' && !info.suffix.startsWith('-')) errors.push(`themeInfo.suffix must start with '-' (got '${info.suffix}')`);
    const bg = info.background as Record<string, unknown> | undefined;
    if (!bg || typeof bg !== 'object') errors.push('themeInfo.background missing');
    else {
      if (!['light', 'dark', 'image'].includes(String(bg.kind))) errors.push(`themeInfo.background.kind invalid: ${String(bg.kind)}`);
      if (typeof bg.css !== 'string' || !bg.css.trim()) errors.push('themeInfo.background.css missing');
    }
  }

  const skill = record.skill;
  if (typeof skill !== 'string' || !skill.trim()) errors.push('missing export skill');
  else {
    for (const section of V_THEME_SKILL_SECTIONS) {
      if (!skill.includes(section)) errors.push(`skill missing mandatory section "${section}"`);
    }
  }

  const examples = record.examples;
  if (examples !== undefined && !Array.isArray(examples)) errors.push('export examples must be an array when present');
  const normalizedExamples: VThemeExample[] = [];
  if (Array.isArray(examples)) {
    examples.forEach((item, index) => {
      const entry = (typeof item === 'object' && item !== null) ? item as Record<string, unknown> : null;
      if (!entry || !['simple', 'portal'].includes(String(entry.pattern)) || typeof entry.ref !== 'string' || !entry.ref.trim()) {
        errors.push(`examples[${index}] must be { pattern: 'simple'|'portal', ref: string }`);
        return;
      }
      normalizedExamples.push({ pattern: entry.pattern as 'simple' | 'portal', ref: entry.ref });
    });
  }

  if (errors.length) return { theme: null, errors };
  return {
    theme: {
      themeInfo: info as unknown as VThemeInfo,
      skill: skill as string,
      examples: normalizedExamples,
    },
    errors: [],
  };
}

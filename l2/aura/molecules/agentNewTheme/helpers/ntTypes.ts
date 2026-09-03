/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.ts" enhancement="_blank"/>

// Types for agentNewTheme: the canonical theme-field model collected/derived at
// the checkpoint, the t1-plan output, the t3 generation output, and the structured
// summary that feeds theme.html + the read-only step view. See flow.json / spec.md.

export type NtBackgroundKind = 'light' | 'dark' | 'image';
export type NtCorners = 'sharp' | 'rounded' | 'pill';
export type NtBorderStyle = 'none' | 'thin' | 'thick';
export type NtShadowStyle = 'none' | 'soft' | 'offset';
export type NtMotion = 'smooth' | 'instant' | 'none';
export type NtTypographyFamily = 'sans' | 'mono' | 'serif';

// The canonical theme fields. surface/on-surface (text) are DERIVED from the
// background kind (not collected). 'image' background is accepted only via free-text css.
export interface NtThemeFields {
  name?: string;
  displayName?: string; // human name; asked so it is not silently invented by the generation
  suffix?: string; // ALWAYS derived from name ('-' + kebab) — never collected on its own,
                   // because the t3 gate requires suffix === '-' + name
  background?: { kind?: NtBackgroundKind; css?: string };
  primary?: string; // brand/accent color
  corners?: NtCorners;
  border?: { style?: NtBorderStyle; color?: string };
  shadow?: NtShadowStyle;
  motion?: NtMotion;
  typography?: { family?: NtTypographyFamily; uppercaseLabels?: boolean };
}

// The free-text slot is not a theme field: it is the last question of the checkpoint, where
// the user types what the coarse enums cannot express (exact values, signature interactions,
// prohibitions). Single source of truth for the id — the t1 gate and the answer resolver
// both key off it.
export const NT_EXTRA_FIELD = 'extra';

// A dynamic question for a missing field — feeds the shared Decision Clarification widget.
export interface NtQuestionOption {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
}
export interface NtQuestion {
  field: string;              // the NtThemeFields path this answers (e.g. 'background.kind')
  question: string;           // localized (userLanguage)
  options: NtQuestionOption[];
  allowNotes: boolean;
}

// t1-plan output (schemas/t1-plan.schema.json).
export interface NtPlan {
  validInput: boolean;
  invalidReason?: string;
  userLanguage: string;
  title: string;
  known: NtThemeFields;       // what the initial prompt already determined
  questions: NtQuestion[];    // only the MISSING fields; empty => skip the checkpoint
}

// Checkpoint answers: field -> chosen value(s) + optional free-text notes.
export interface NtAnswer {
  field: string;
  value?: string;
  values?: string[];
  notes?: string;
}

// Structured summary produced by t3 — drives theme.html AND the read-only step view.
export interface NtPaletteSwatch {
  token: string;   // e.g. '--ml-primary'
  label: string;   // e.g. 'Primary'
  color: string;   // resolved CSS color
}
export interface NtSignatureRow {
  aspect: string;  // e.g. 'Corners'
  value: string;   // e.g. 'sharp (radius 0)'
}
export interface NtThemeSummary {
  name: string;
  displayName: string;
  background: { kind: NtBackgroundKind; css: string };
  palette: NtPaletteSwatch[];
  signature: NtSignatureRow[];
}

// t3-generate tool result (schemas/t3-generate.schema.json).
export interface NtGenerated {
  themeTs: string;          // the complete theme.ts (contract v1, English comments)
  summary: NtThemeSummary;
}

// l4/agentNewTheme/draft.json — held between t3 and the confirm at t4.
export interface NtDraft {
  themeTs: string;
  summary: NtThemeSummary;
}

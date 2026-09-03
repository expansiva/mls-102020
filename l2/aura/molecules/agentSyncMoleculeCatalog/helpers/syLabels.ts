/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syLabels.ts" enhancement="_blank"/>

// Color and label, DERIVED — never stored in a .defs.ts (decision D3a, the brief §6.2 / analysis §5.2).
//
// Consumed only by s3 (the index.ts migration, out of this stopping point's scope — the brief §9 "pare
// depois do E7") — no field in index.defs.ts or skill.ts carries either. Built now anyway because the
// todo assigns it to E4 regardless, so whoever builds s3 later does not have to re-derive it.
//
// ⚠️ THE PALETTE, measured on 2026-08-25 across groups of 3/4/8/12 molecules: the SAME 10-color cycle,
// paired 1:1 with the cards in the group's CURRENT index.ts, in the order the cards were IMPORTED —
// which is historical (when each molecule was added), NOT the alphabetical order this agent publishes
// `molecules[]` in. Re-deriving the palette against the alphabetical order would repaint every card
// whose historical position differs from its alphabetical one (groupEnterText's 'Enter Text' card is
// last, historically, but sorts third alphabetically) — a real behavior a future s3 has to account for,
// not something syPaletteColor can fix by itself. Documented here and in flow.json so it is not
// rediscovered as a bug later.

export const SY_PALETTE = ['violet', 'emerald', 'amber', 'rose', 'sky', 'indigo', 'purple', 'teal', 'orange', 'pink'];

export function syPaletteColor(index: number): string {
  const length = SY_PALETTE.length;
  return SY_PALETTE[((index % length) + length) % length];
}

/**
 * Acronyms that must stay fully upper-case instead of being title-cased ('Cpf' is a defect, not a
 * variant — the brief §6.2, measured on `ml-cpf-input`). Short and curated on purpose: a wrong guess here is
 * a cosmetic label, not an invented tag, so the list grows as new acronyms show up in molecule names.
 */
const KNOWN_ACRONYMS = new Set(['CPF', 'CNPJ', 'CEP', 'OTP', 'URL', 'PDF', 'NPS', 'CSAT', 'CES', 'QR', 'ID', 'API', 'HTML', 'CSS', 'OCR']);

/** 'groupentertext--ml-cpf-input' -> 'CPF Input'. No rule decides which words drop 'Input' etc. (§6.2: the
 * hand-abbreviated table has none either — "input" is kept in 2 cases and dropped in 2) — this always
 * keeps every word, which is a defensible default and not what the hand-edited table happens to do. */
export function syShortLabel(tag: string): string {
  const shortName = tag.includes('--') ? (tag.split('--').pop() as string) : tag;
  const bare = shortName.replace(/^ml-/, '');
  return bare
    .split('-')
    .filter(Boolean)
    .map(word => {
      const upper = word.toUpperCase();
      if (KNOWN_ACRONYMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/// <mls fileReference="_102020_/l2/aura/plugins/helpers/localeFlag.ts" enhancement="_blank"/>

// Flags for a locale picker, as inline SVG.
//
// Why not emoji: `🇧🇷` is a pair of regional-indicator letters, and Chrome on Windows has no flag
// glyphs for them — it renders "BR". So the picker would show letters on the very platform the
// studio runs on. These are deliberately SIMPLIFIED marks (no stars on the US canton, no shield on
// the Portuguese circle): at 20×14 CSS pixels the detail is invisible anyway, and the goal is to
// recognize a row at a glance.
//
// A locale with no flag here is NOT a bug: `flagChip` gives the caller the uppercase code to show
// instead, which is why every function is total.

const FLAGS: Record<string, string> = {
  br: '<rect width="24" height="16" fill="#009b3a"/><path d="M12 1.6 22.4 8 12 14.4 1.6 8Z" fill="#ffdf00"/><circle cx="12" cy="8" r="3.4" fill="#002776"/>',
  pt: '<rect width="24" height="16" fill="#da291c"/><rect width="9.6" height="16" fill="#046a38"/><circle cx="9.6" cy="8" r="3" fill="#ffe900" stroke="#fff" stroke-width="0.6"/>',
  us: '<rect width="24" height="16" fill="#fff"/><g fill="#b22234"><rect width="24" height="1.23" y="0"/><rect width="24" height="1.23" y="2.46"/><rect width="24" height="1.23" y="4.92"/><rect width="24" height="1.23" y="7.38"/><rect width="24" height="1.23" y="9.84"/><rect width="24" height="1.23" y="12.3"/><rect width="24" height="1.24" y="14.76"/></g><rect width="10" height="8.61" fill="#3c3b6e"/>',
  gb: '<rect width="24" height="16" fill="#012169"/><path d="M0 0 24 16M24 0 0 16" stroke="#fff" stroke-width="3"/><path d="M0 0 24 16M24 0 0 16" stroke="#c8102e" stroke-width="1.6"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5"/><path d="M12 0v16M0 8h24" stroke="#c8102e" stroke-width="3"/>',
  es: '<rect width="24" height="16" fill="#c60b1e"/><rect width="24" height="8" y="4" fill="#ffc400"/>',
  fr: '<rect width="24" height="16" fill="#fff"/><rect width="8" height="16" fill="#002395"/><rect width="8" height="16" x="16" fill="#ed2939"/>',
  de: '<rect width="24" height="16" fill="#dd0000"/><rect width="24" height="5.34" fill="#000"/><rect width="24" height="5.33" y="10.67" fill="#ffce00"/>',
  it: '<rect width="24" height="16" fill="#fff"/><rect width="8" height="16" fill="#008c45"/><rect width="8" height="16" x="16" fill="#cd212a"/>',
  jp: '<rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.4" fill="#bc002d"/>',
  cn: '<rect width="24" height="16" fill="#de2910"/><path d="m5 2.2 1.05 3.23-2.75-2h3.4l-2.75 2Z" fill="#ffde00"/>',
  nl: '<rect width="24" height="16" fill="#fff"/><rect width="24" height="5.34" fill="#ae1c28"/><rect width="24" height="5.33" y="10.67" fill="#21468b"/>',
  ru: '<rect width="24" height="16" fill="#fff"/><rect width="24" height="5.33" y="5.33" fill="#0039a6"/><rect width="24" height="5.34" y="10.66" fill="#d52b1e"/>',
  ar: '<rect width="24" height="16" fill="#006c35"/><rect width="24" height="1.4" y="7.3" fill="#fff"/>',
};

/** Language subtag → the flag it is usually shown with, when the locale carries no region. */
const LANGUAGE_REGION: Record<string, string> = {
  pt: 'pt',
  en: 'us',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'jp',
  zh: 'cn',
  nl: 'nl',
  ru: 'ru',
};

/** `pt-BR` → `['pt', 'br']`; a malformed locale yields what it can. */
function parts(locale: string): { language: string; region?: string } {
  const [language, region] = String(locale ?? '').trim().toLowerCase().split(/[-_]/u);
  return { language: language ?? '', region: region || undefined };
}

/**
 * The flag markup for a locale, or undefined when there is none — the REGION decides (`pt-BR` is the
 * Brazilian flag, `pt` the Portuguese one), falling back to the language's usual flag.
 *
 * @returns The inner SVG of a 24×16 viewBox, ready to inline; never a whole `<svg>` element, so the
 * caller owns the size and the rounding.
 */
export function localeFlagMarkup(locale: string): string | undefined {
  const { language, region } = parts(locale);
  if (region && FLAGS[region]) return FLAGS[region];
  const fallback = LANGUAGE_REGION[language];
  return fallback ? FLAGS[fallback] : undefined;
}

/** What to show when there is no flag: the locale itself, uppercased (`pt-br` → `PT-BR`). */
export function flagChip(locale: string): string {
  return String(locale ?? '').trim().toUpperCase();
}

/** REGION codes this module can draw a flag for — the tests walk them through `localeFlagMarkup`. */
export function knownFlagLocales(): string[] {
  return Object.keys(FLAGS);
}

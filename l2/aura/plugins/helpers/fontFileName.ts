/// <mls fileReference="_102020_/l2/aura/plugins/helpers/fontFileName.ts" enhancement="_blank"/>

// What a font FILE name says about the font, so the DS editor can fill the card when the user picks
// a file from the project media: `rafter-party-bold-italic.woff2` → family "Rafter Party",
// weight 700, style italic, role "rafter-party".
//
// Only words that are unambiguous weight / style names are taken out of the family; anything else
// (a "Demo", a "Pro") stays part of it.

const WEIGHTS: ReadonlyArray<[RegExp, number]> = [
  [/^(thin|hairline)$/u, 100],
  [/^(extralight|ultralight)$/u, 200],
  [/^light$/u, 300],
  [/^(regular|normal|book|roman)$/u, 400],
  [/^medium$/u, 500],
  [/^(semibold|demibold)$/u, 600],
  [/^bold$/u, 700],
  [/^(extrabold|ultrabold)$/u, 800],
  [/^(black|heavy)$/u, 900],
];

const STYLE_WORDS = /^(italic|oblique)$/u;
const NOISE_WORDS = /^(webfont|web|variable|vf|subset)$/u;
const NUMERIC_WEIGHT = /^[1-9]00$/u;

export interface IFontFromFile {
  family: string;
  weight: number;
  style?: 'italic';
}

/** Words of a file name, without folders and extension, split on `-`, `_`, spaces and camelCase. */
function words(fileName: string): string[] {
  const base = fileName.replace(/[?#].*$/u, '').split('/').pop() ?? '';
  const stem = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
  return stem
    .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .split(/[-_\s.]+/u)
    .filter(Boolean);
}

export function fontFromFileName(fileName: string): IFontFromFile {
  let weight = 400;
  let style: 'italic' | undefined;
  const kept: string[] = [];
  const all = words(fileName);
  for (const word of all) {
    const lower = word.toLowerCase();
    // "BoldItalic" in one word is common too.
    const glued = /^(.*?)(italic|oblique)$/u.exec(lower);
    const weightWord = glued && glued[1] ? glued[1] : lower;
    if (glued && glued[1] && WEIGHTS.some(([re]) => re.test(weightWord))) {
      weight = WEIGHTS.find(([re]) => re.test(weightWord))![1];
      style = 'italic';
      continue;
    }
    const named = WEIGHTS.find(([re]) => re.test(lower));
    if (named) { weight = named[1]; continue; }
    if (NUMERIC_WEIGHT.test(lower)) { weight = Number(lower); continue; }
    if (STYLE_WORDS.test(lower)) { style = 'italic'; continue; }
    if (NOISE_WORDS.test(lower)) continue;
    kept.push(word);
  }
  // A file named only "Bold.woff2" still needs a family.
  const familyWords = kept.length ? kept : all;
  const family = familyWords
    .map((word) => (word === word.toUpperCase() && word.length > 1 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
  return style ? { family, weight, style } : { family, weight };
}

/** The card's role from a family: lowercase, dashes — the same rule the role field applies on input. */
export function roleFromFamily(family: string): string {
  return family.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
}

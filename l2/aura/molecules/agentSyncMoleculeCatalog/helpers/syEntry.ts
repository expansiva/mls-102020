/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syEntry.ts" enhancement="_blank"/>

// What the mention asked for: which groups, and whether the index.ts (opt-in) was requested. Pure —
// no I/O, no mls.* access. The group TOKENS come back raw (not yet validated against a known list);
// validation against the discovered groups is syDiscover's job (helpers/syDiscover.ts), because only
// it knows which groups actually exist.
//
// ⚠️ DECISION D1a (closed 2026-08-25, the brief §2 / analysis §9): detecting the index.ts opt-in is
// DETERMINISTIC WORD MATCHING. No clarification, no classifier — a wrong guess towards "no index.ts"
// costs nothing (the run is asked again); a wrong guess towards "yes" would rewrite up to 795 lines of
// authored Lit. So a mention that TALKS ABOUT the index page without matching one of the recognized
// phrases is refused BY NAME, never silently interpreted either way (the same precedent
// agentChooseMolecules uses when more than one catalog is reachable).

export interface SyEntry {
  wantsAll: boolean;
  /** Raw, as the user typed them (case preserved). Empty when wantsAll. */
  groupTokens: string[];
  includeIndexTs: boolean;
  /** Set only when the mention could not be parsed — group-name validity is checked elsewhere. */
  error: string;
}

const ALL_WORDS = new Set(['all', 'todos', 'todas']);
const LEADING_WORDS = new Set(['atualizar', 'atualize', 'gerar', 'gere', 'sincronizar', 'sincronize', 'sync', 'update']);
const GROUP_WORDS = new Set(['grupo', 'grupos', 'group', 'groups']);

/** Recognized ways of asking for the index.ts (G2), matched as a whole phrase (accents/case folded). */
const INDEX_PHRASES = [
  'incluindo o arquivo index.ts',
  'incluindo o index.ts',
  'incluindo index.ts',
  'com o arquivo index.ts',
  'com index.ts',
  'com todos os arquivos',
  'including the index.ts file',
  'including index.ts',
  'with all files',
];

/** A mention that names the index page without a recognized phrase is ambiguity, refused by name. */
const INDEX_HINT = /\bindex(\.ts)?\b|p[áa]gina|showcase/i;

export function syParseEntry(raw: string): SyEntry {
  const text = (raw || '').trim();
  if (!text) return { wantsAll: true, groupTokens: [], includeIndexTs: false, error: '' };

  const normalized = foldAccents(text).toLowerCase();

  let includeIndexTs = false;
  let withoutIndexPhrase = text;
  for (const phrase of INDEX_PHRASES) {
    const at = normalized.indexOf(phrase);
    if (at < 0) continue;
    includeIndexTs = true;
    withoutIndexPhrase = `${text.slice(0, at)} ${text.slice(at + phrase.length)}`;
    break;
  }

  if (!includeIndexTs && INDEX_HINT.test(withoutIndexPhrase)) {
    return {
      wantsAll: false,
      groupTokens: [],
      includeIndexTs: false,
      error: `não entendi o pedido sobre o index.ts — para incluí-lo, escreva 'incluindo o arquivo index.ts' ou 'com todos os arquivos' depois dos grupos; sem isso, o index.ts não é tocado`,
    };
  }

  const tokens = withoutIndexPhrase.trim().split(/\s+/).filter(Boolean);
  while (tokens.length) {
    const head = foldAccents(tokens[0]).toLowerCase();
    if (!LEADING_WORDS.has(head) && !GROUP_WORDS.has(head)) break;
    tokens.shift();
  }
  const rest = tokens.join(' ').trim();

  if (!rest || ALL_WORDS.has(foldAccents(rest).toLowerCase())) {
    return { wantsAll: true, groupTokens: [], includeIndexTs, error: '' };
  }

  const groupTokens = rest
    .split(/,| e /i)
    .map(item => item.trim())
    .filter(Boolean);

  return { wantsAll: false, groupTokens, includeIndexTs, error: '' };
}

function foldAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

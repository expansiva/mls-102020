/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/locale.ts" enhancement="_blank"/>

// Catalogue keys of a product language, the same as agentAddLanguage writes them
// (aura/agentManageLanguages/helpers/addLanguageCore.ts, normalizeLocale): the whole BCP-47 code in lower case,
// `_` read as `-`. The page catalogue map uses the key ('pt-br'), and the const takes the key with every non
// alphanumeric run as `_` (pageMessage_pt_br). The runtime (getMessageKey, _102029_/l2/collabLitElement.ts)
// matches the exact `document.documentElement.lang` first, then two letters, then the first catalogue.

/** 'pt-BR' → 'pt-br'; 'pt_BR' → 'pt-br'; '' for a blank code. */
export function m4LocaleKey(language: string): string {
  return language.trim().replace(/_/gu, '-').toLowerCase();
}

/** The suffix of the catalogue const of a key: 'pt-br' → 'pt_br' (const pageMessage_pt_br). */
export function m4LocaleConst(key: string): string {
  return key.replace(/[^a-z0-9]+/gu, '_');
}

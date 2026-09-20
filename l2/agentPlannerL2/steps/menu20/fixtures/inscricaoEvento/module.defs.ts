/// <mls fileReference="_102047_/l4/inscricaoEvento/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "inscricaoEvento",
  "title": "Inscrição em eventos",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR",
    "en"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "módulo inscricaoEvento, em português e inglês. o organizador cadastra eventos com título, descrição, data, local e número de vagas, e publica. cada evento publicado tem uma página pública onde qualquer pessoa se inscreve com nome e e-mail; o mesmo e-mail só pode se inscrever uma vez por evento. quando as vagas acabam, novas inscrições entram em lista de espera na ordem de chegada; se um inscrito cancelar, o primeiro da lista de espera é promovido. o organizador vê os inscritos, o total de vagas ocupadas e baixa a lista em CSV. perfis: organizador e público."
} as const satisfies Ns5ModuleArtifact;

export type InscricaoEventoModuleType = typeof inscricaoEventoModule;

export default inscricaoEventoModule;

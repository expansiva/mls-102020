<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-07-30 (handoff @@addLanguage no fim da task) — o shared `.ts` gerado carrega UM catálogo de
  mensagens (o `defaultLocale` do módulo): `cfeSharedScaffold.renderI18n` emite um único
  `message_<default>` + `messages`. Um módulo que declara 2+ idiomas em `l4/<module>/module.defs.ts`
  ficava só com o default. O último step agora despacha uma
  mensagem `@@addLanguage <json>` — task INDEPENDENTE pelo `beforePromptImplicit` do próprio
  `agentAddLanguage` (mesmo handoff que o agentNewSolution usa para `@@changeBackend`/`@@changeFrontend`;
  o runtime remove a menção antes do agente ver o payload, `aiAgentOrchestration.ts:48`). Barato por
  construção: o agentAddLanguage manda só o bloco i18n de cada shared para um modelo `translate`
  (gpt-4.1-mini, ~$0.025/arquivo) — nada é regerado. Payload igual ao do plugin
  `aura/plugins/selectLanguage.ts`: `[{languages:[{code,name}],projectId,moduleName}]`, com o `name`
  caindo no próprio `code` quando o catálogo (`_102027_/l2/collabLanguages`) não o conhece.
  **Módulo com 1 idioma não gera task nenhuma** (`buildAddLanguageMessage` devolve null). O módulo sai
  das páginas efetivamente finalizadas (não de `context.moduleNames`, que lista todo o projeto) e os
  códigos são os `activeLocales` já normalizados (2 letras), que é a chave em que o bloco i18n indexa
  (`messages.pt`). Falha no despacho é traçada e NUNCA derruba a task (os artefatos já estão em disco;
  o trace mostra a mensagem para reenvio manual). Verificado: payload idêntico ao
 para o 102045 (en + pt-BR -> pt/Portuguese), null para
  módulo de 1 idioma, default nunca retraduzido, código desconhecido cai no code.

- 2026-07-13: documented the current finalize step boundary and moved `agentCfeCreateFinalize.ts` into this step folder.

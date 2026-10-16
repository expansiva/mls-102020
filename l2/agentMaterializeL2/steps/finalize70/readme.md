# finalize70 — registra as páginas no config

Determinístico, sem LLM. Roda depois do `pages50`, ou do `review55` quando o run tem `--review`. Grava a parte do frontend da entrada do
módulo em `mls-<cliente>/l5/config.json`, e só quando algo mudou.

| Dado | Fonte |
|---|---|
| páginas | as aceitas no `input20` com page11 desktop aprovado no `pages50` (recibo + arquivo igual) |
| ordem e rótulo | `l4/<módulo>/pool/l2/web/menu.json`, `tree` (hubs achatados; página fora do menu vai no fim) |
| papéis | `menu.json`, `authorities` (um hub dá os filhos); reserva `shared.access.actors` |
| descrição | a primeira frase do `intent` do page11 desktop |
| página inicial | a primeira página da lista do papel no `authorities`; reserva: a primeira do papel na ordem do menu |
| línguas | `productLanguages` e `userLanguage` do `l4/<módulo>/module.defs.ts` |

Escreve: `moduleId`, `shellMode`, `basePath`, `userLanguage`, `languages`, `navigation`, `landings` e `frontend` (`layer`, `pages`; mantém
`pageTests`). Não toca em: `backendControllers`, `persistenceModules`, `headerLinks` (só cria vazio), chaves desconhecidas, outros módulos e
`l5/project.json`. Compõe o módulo inteiro mesmo com `--page`/`--genome`. Variantes (`page21`…) não viram páginas: o shell troca na mesma rota.

Recibo: `pipeline/agentMaterializeL2/finalize70.json`. O montador da publicação (`nodejsSaveConfigJson.ts`) deixa esses módulos em paz.

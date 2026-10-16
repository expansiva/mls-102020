# finalize70 — CHANGELOG

- 2026-10-16: criado (TASK-102020-materialize-l2-finalize70).
  - `compose.ts` puro; `run.ts` com o port do Studio; `agentM4Finalize.ts` emite `finalize70-done`; o pipeline fica `complete` nele.
  - Página inicial: a primeira da lista do papel no `menu.json` (`authorities`), não a primeira do menu. Pela ordem do menu, o gestor do
    `tarefas` cairia em `meus_avisos`, que fica no hub do membro antes do "Painel da equipe".
  - Testes: o `reembolsoDespesas` real compõe a entrada feita à mão (só mudam a ordem, que passa a ser a do menu, e as descrições); o
    `tarefas` achata o hub `minha_area` e dá `meus_avisos` aos dois papéis; o run grava uma vez, mantém o CRLF e não toca em outro módulo.
  - `nodejsSaveConfigJson.ts`: pula o módulo cujos page11 estão no formato novo (objeto), para não desfazer o registro na publicação.

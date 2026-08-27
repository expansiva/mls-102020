<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-08-27 (shared dts persistido e referenciado — cf_shared_dts_persistido_e_ref) — o artefato
  compilado do shared muda de `trace/frontend-shared-dts/<page>.txt` para `web/shared/<page>Dts.txt`
  (visível ao lado do shared, decisão do Wagner 27/ago). `<page>Dts.txt` e não `<page>.d.ts`:
  shortName do stor não tem ponto (nomes_sem_ponto; '.d.ts' não é extensão composta conhecida do sync
  e viraria shortName `<page>.d` — família do bug SW add versionRef 0); prova de 27/ago: um `.d.ts`
  real ao lado do shared é inerte para o tsc do mls-base (import de `<page>.js` resolve para o `.ts`;
  skipLibCheck esconde o declaration file), mas só enquanto skipLibCheck durar. O item l2_page passa
  a DECLARAR o artefato em dependsFiles (sem troca implícita; defs antigos seguem funcionando pelo
  branch legado), os planners sondam o shared .ts por trás do artefato (dependencyProbeRefs), o
  verify da phase re-persiste o artefato de um shared que só compilou após repair
  (persistSharedDtsArtifactIfStale — run02 102047: taskCatalogue nunca nasceu), o trace de cada item
  declara `context=dts` ou `context=raw-ts (motivo)` nos DOIS runtimes, e o scaffold leva o
  `purpose` (título do l4) para o JSDoc de action/handler — uma linha, sem despejo.

- 2026-08-26 (gates declaram, raio por item) — doutrina "declarar, não bloquear" no verify e no
  closing gate. Guard sistêmico exige a mesma assinatura do primeiro erro (não o placar). `.test.ts`
  e prosa nunca bloqueiam; gates de qualidade reparam e, esgotado o orçamento, declaram. Um shared
  compile-quebrado só pula quem depende dele. Summary/status: blocked × repaired × declared.

- 2026-08-24 (rótulos e ids na lista) — célula de enum que pinta o código armazenado
  (`inProgress`, `medium`) é finding reparável (`collectEnumCellLabelIssues`); o rótulo do l4
  (enumLabels/lifecycleLabels) é o default, o código é só fallback. Coluna cujo field é `id`/`*Id`
  com title/name na mesma tabela é finding (`collectIdColumnIssues`) — UUID não é coluna default,
  o id continua no state. Regras 9–10 nas skills page11/page21 na mesma entrega.

- 2026-08-24 (seleção e estado de botão) — três gates no verify da page/shared, regras nas
  skills page11/page21/shared na mesma entrega. (1) lista `selection:single` (ou id de
  rota/seleção ao lado de uma lista) sem clique de linha / `<select>` é finding reparável
  (`collectSelectionControlIssues`). (2) command com id required de rota/seleção vazio e
  botão clicável (sem `?disabled` + `title`) é clique morto — `collectCommandDisabledIssues`.
  (3) getById cujo input required é só `routeParam` tem de estar em `initialLoads`
  (`collectMissingInitialLoadIssues`, warning: o .ts do shared não reescreve o defs).
  Geração: `queryQualifiesForInitialLoad` — required route entra no boot; userInput/selection
  required continua fora (102049 searchProducts 400).

- 2026-08-24 (erro do envelope na tela) — HTTP 4xx do `/execBff` carrega o envelope
  `{ok:false, error:{code,message}}`; o texto da tela é `error.message` (ou i18n keyed por
  `error.code`), nunca "Erro do servidor (400)". O `bffClient` (102029) passou a devolver o
  envelope em vez de sintetizar o status. Gate `collectMutationEnvelopeErrorIssues` no shared
  gerado + fidelidade do error state em `collectMutationFeedbackIssues`. Mesma entrega: regra
  nas skills shared/page11/page21.

- 2026-08-24 (enum nunca é texto livre) — campo cuja união no contrato é literal (ou cujo shared
  input state carrega `valueSet` do l4 enum[]) ligado a `<input>` de texto (typed ou untyped) é
  finding reparável. `collectEnumTextInputIssues` no verify; select/botões de transição passam.
  Filtro de enum é select com opção vazia. A regra entra nas duas skills de render na mesma
  entrega (page11 não tinha nenhuma; page21 já cobria transição-como-botões). O contrato l2
  passa a emitir a união literal no INPUT quando o l4 declara enum[] — sem isso o gate era no-op
  (`status: string`).

- 2026-08-22 (guard por ORIGEM do dado, fe4) — `collectContractFieldIssues` cobria `selected.campo`
  (find/[0]/at) e `(row: QryXOutput) =>`. A terceira forma — `(row: (typeof rows)[number]) =>
  row.serviceExecutionId` nas linhas 55–74 de `recordInStoreServiceAttendance` — escapou. Perseguir
  formas perde. O guard agora rastreia identificadores que derivam de `this.<bffId>Data` (atribuição,
  find/at/[0], callback de map/forEach/filter/find, parâmetro `(typeof list)[number]`) e só permite
  campos declarados naquele bff. As duas formas anteriores continuam cobertas (mesmo `seen`).

- 2026-08-22 (run fe2 do petShop: 15 erros de tsc em 5 arquivos mataram a task no gate final) — 4 causas,
  4 fixes, nenhum afrouxamento de gate:
  * **locale fantasma**: `i18nMeta.defaultLocale` vem COLAPSADO (`pt`) e `runtimeLocales` PRESERVA a
    região (`pt-br`), então `[default, ...declared.filter(l => l !== default)]` deixava os dois entrarem
    e a página saía com dois catálogos idênticos. Agora `catalogueLocales` (cfeSharedScaffold) — o default
    colapsado só entra quando NENHUM declarado realiza a mesma língua primária, e `en` + `en-AU` seguem
    sendo dois catálogos. Isto elimina por construção o TS2353 do page11 (a chave só existia na cópia
    que não define o tipo).
  * **catálogo reescrito à mão**: as skills mandavam manter "o bloco `collab_i18n_*` (seus consts, seu
    tipo, seu mapa)" enquanto o esqueleto emite `pageMessage_<locale>`/`PageMessageType`/`pageMessages`.
    7 de 19 arquivos page21 reconstruíram o token que a skill nomeava — 3 idiomas `as const` para um
    módulo de UM idioma = 6× TS2322. Skills corrigidas para nomear o que o esqueleto emite, proibir
    `as const` em catálogo e fixar o conjunto de locales; guard textual novo
    `collectPageCatalogueIssues` pega o residual no mesmo loop que salvou o arquivo.
  * **campo de comando lido da query**: `collectContractFieldIssues` só seguia `<array>.map(row => …)`;
    uma página que seleciona UM registro (`rows.find(…)`, `rows[0]`) escapava inteira — 7× TS2339 em
    `selected.inStorePaymentId`/`serviceStartedAt`/… , campos que são saída dos COMANDOS. Guard estendido
    ao registro selecionado, com o remédio certo na mensagem, + regra nas duas skills.
  * **helper recursivo**: a skill dizia "nunca anote retorno de render, a inferência é sempre correta" —
    e para um helper recursivo não existe inferência (TS7023/7024). Exceção estreita adicionada.


- 2026-08-21 (rodada 7: falha de LLM em 1 slot matava a task) — `createFanoutStep` passou a nascer com
  `onFailure: 'wait_after_prompt'`, e com isso os 4 hosts deste agente (materialize, repair, split de
  organismos, composicao da pagina). Evidencia: `msgtask_fe1` do petShop — um HTTP 402 no modelo de
  fallback derrubou a task com 14/57 paginas prontas e 8 slots orfaos em `in_progress`. O comentario
  "fan-out slots NEVER return 'failed'" cobria os RETORNOS do agente; a falha de LLM acontece no
  harness, ANTES do `afterPromptStep`, e caia no default que passa `newTaskStatus: 'failed'`.
  `'skip'` NAO resolveria: marca o slot como failed, o que derruba a task enquanto os irmaos estao
  ativos e derruba o host quando eles drenam.

- 2026-07-31 (item B + B.1 do supervisor: 4 defeitos transversais como REGRA e como CHECK) —
. Cada defeito virou regra nas DUAS skills de render e check
  deterministico no verify; regra sozinha nao segura (a disciplina de titulos ja reincidiu 3x).
  Checks novos em cfeMaterializeCore, todos sobre o .TS GERADO e ancorados nos dataBindings do defs
  reduzido — com defs sem layout a verdade mora no OUTPUT (mesmo movimento do harness 102040):
  * collectTechnicalVocabularyIssues (B1) — displayHint/intent/bffCall humanizado como texto visivel
    ("Summary first" era um displayHint). Compara texto entre tags e title/aria/placeholder.
  * collectPageExperienceIssues (B2+B3) — page/pageSize/sortBy/offset/limit amarrados a controle de
    formulario, e id cujo `source` l4 nao e decisao do usuario amarrado a input/select/textarea.
  * collectHeadingDisciplineIssues (B4) — heading que repete o label do controle adjacente.
  * collectMutationFeedbackIssues — cada comando renderiza caminho de sucesso E de erro, LOCAL.
  Entram como ERRO (nao warning): sao deterministicos e a reescrita do .ts conserta — que e o que a
  rodada de repair faz.
  DECISAO B.1 DO SUPERVISOR aplicada: os 2 checks que `validateGeneratedPageQuality` perdeu com o defs
  reduzido foram REESCRITOS sobre o .ts, e ficaram melhores que os originais: (1) o id-editavel agora e
  SOURCE-AWARE (o antigo era heuristica de nome) usando `isIdInputName`, espelho exato do
  `isNsIdInputName` do agentNewSolution — as duas definicoes de "id" nao podem divergir; (2) o feedback
  de mutacao julga "os dois caminhos existem e sao locais", com `action.{cmd}.success/error` como
  evidencia preferida mas NAO obrigatoria — exigir a chave literal imporia uma convencao de i18n que o
  defs reduzido nao carrega mais.
  Pre-requisito entregue junto: as duas skills de render deixaram de mandar usar `layout.sections`
  (que nao existe mais) e passaram a coreografar de dataBindings + purpose + contrato; a page21 delega a
  ESTRUTURA a skill de experiencia anexada depois dela. Para isso o `source` de cada input passou a
  viajar no defs (`dataBindings[].inputs[]` = name/stateKey/source/required, em enrichLayoutWithStateRefs)
  — e o item B3 e o ancoradouro dos checks.
  ARMADILHA (ja custou um ciclo): as skills sao TEMPLATE LITERAL — nenhum backtick pode entrar no corpo.
  Verificado: 6 checks com teste unitario (caso ruim e caso correto), as duas skills carregam com as 4
  regras presentes, typecheck limpo, suite 85/85.

- 2026-07-31 (monaco models liberados na materializacao) — `cfeMaterializeStudio` criava um model do
  Monaco por arquivo materializado e nunca liberava; numa geracao de modulo (dezenas de arquivos) o
  Monaco cruza o limite e cospe "potential listener LEAK detected, having 200 listeners already",
  deixando o console inutil para diagnostico. Mesmo tratamento ja aplicado no agentChangeBackend
  (cbMaterializeIo). Dois pontos: (1) `saveGeneratedTs` decide a POSSE antes de gravar
  (`!mls.editor.models[getKeyModel(...)]` — depois de gravar daria sempre false, porque
  createStorFile(needCreateModel) e getOrCreateModel ja criaram) e libera no `finally`, inclusive em erro;
  o release e DIFERIDO ate `activeCompiles === 0` porque a fase materializa em `parallel_dynamic` e
  descartar o model de A enquanto B (que importa A) compila produz erro de compile FALSO que queima
  orcamento de repair. (2) `saveArtifactTextByMlsPath` passava `needCreateModel=true` contrariando o
  proprio contrato ("no editor model, no compile") — agora `false`, o model nunca chega a existir.
  Nunca libera model que nao e nosso: um arquivo aberto numa aba do Studio ja esta no registry e e
  preservado. `deleteModels` nao toca `mls.stor` — o arquivo gerado fica intacto.
  NAO COBERTO (decisao pendente): `compileAndGetErrors` e `getCompiledDtsByMlsPath` tambem criam models
  via `getGeneratedModel` e seguem sem release — sao o caminho do VERIFY, e o preload de .d.ts das
  dependencias (fix do run19, que faz o compile por-arquivo resolver tipos cross-file) depende justamente
  de esses models continuarem carregados. Liberar ali exige coordenar com aquele fix.

- 2026-07-31 (l2_shared determinístico TAMBÉM no Studio — fecha o MAX_TOKENS) — a task
  `buildFlowFsm - frontend` morreu com `ERROR(MAX_TOKENS_REACHED)` em 50000 tokens, 11m39s e $0.30, no
  step `materialize-projectdetailworkspace-l2-shared`. É o MESMO muro do run03 que o scaffold
  determinístico (28/jul) foi criado para derrubar — mas ele só havia sido ligado no CLI
  (`nodejsMaterializeL2 materializeSharedDeterministic`), e o Studio (`agentCfeMaterializeGen`) seguia
  chamando o LLM para l2_shared (pendência declarada no próprio CHANGELOG: "wire it with the pages
  session"). Agora o `beforePromptStep` tenta o scaffold ANTES de montar o prompt: se ele renderiza, o
  step conclui sem NENHUMA chamada de modelo; se devolve `{code:null, reason}` (defs fora do que ele
  modela), cai no LLM exatamente como antes. Persiste o mesmo que o caminho LLM — mesmo `saveGeneratedTs`,
  mesmo typecheck test, mesmo gate de compile, mesmo `persistSharedDtsArtifact` — então nada a jusante
  distingue os dois. Fallback conservador em TRÊS pontos: sem contrato legível, scaffold bail, ou saída
  que não compila -> LLM (o arquivo em disco é sobrescrito pela saída dele). Verificado com defs real
  (102051 posWorkspace, o maior disponível): 38KB de defs -> 56KB de .ts (~16k tokens) gerados sem LLM,
  e o catálogo saiu `{ 'pt': message_pt }` (a correção de locale do dia anterior). O defs do
  projectDetailWorkspace não pôde ser testado porque o `rebuild-all` que falhou limpou o l2 do 102045.

- 2026-07-30 (token de fundo usado como cor de texto) — mls-102045 gerou
  `bg-[var(--bg-secondary-color,#334155)] text-[var(--bg-primary-color,#ffffff)]`: um token de FUNDO como
  cor do rótulo. Só parece certo enquanto vale o fallback hardcoded do `var()`; com o tema aplicado (os
  dois tokens escuros) o texto some. Nenhuma checagem via: o nome do token existe, então a única regra do
  prompt ("do not invent token names") foi respeitada. Três frentes:
  (1) `summarizeDesignSystemTokens` passou a emitir a REGRA DOS PARES derivada dos próprios nomes
  (`designTokenRoleRules`): o designSystem.ts chega ao modelo resumido a NOMES, então o cabeçalho do
  arquivo — que documenta "quem usa button-primary-bg escreve o rótulo com button-primary-text" — nunca
  chegava. A regra só é emitida quando o vocabulário TEM pares `-bg`/`-text` (DS role-based); um projeto
  no vocabulário antigo e plano segue sem ruído.
  (2) guard determinístico `collectDesignTokenRoleIssues` no verify, como ERRO reparável (é defeito puro
  de .ts que a reescrita conserta, e a checagem não tem julgamento): `-bg` em utilitário de texto
  (text/placeholder/caret/decoration) ou `-text` em `bg-`. Cobre prefixos de estado (hover:, dark:) e as
  variantes -hover/-focus/-disabled, e a mensagem já nomeia o token correto do MESMO papel. Deduplica.
  (3) o exemplo das skills de render (page11/page21) citava `--ds-color-surface`/`--ds-color-text` — uma
  terceira convenção que não existe em NENHUM dos dois design systems; trocado por nomes reais do DS novo
  e marcado como ilustrativo, mais a regra de papel explicitada nas duas skills.
  Verificado com o caso real: no vocabulário NOVO o guard pega (`text-[var(--button-primary-bg)]` ->
  aponta `button-secondary-text`), na forma correta não acusa, e no vocabulário ANTIGO não acusa nada
  (sem sufixo de papel não há o que impor). LIMITE conhecido: o vocabulário antigo (bg-primary-color /
  text-primary-color) NÃO é coberto por nenhuma das três frentes — o ganho vem de migrar o projeto para o
  DS role-based, que é o plano (102051).

- 2026-07-30 (i18n: fim do `en` hardcoded + região preservada) — o catálogo do shared saía SEMPRE como
  `message_en`/`messages.en`, mesmo num módulo cujo `defaultLocale` é outro: um módulo pt-BR emitia
  `message_en` com texto português, e o runtime (que procura `messages[document.lang.toLowerCase()]`, com
  `document.lang` vindo de `listRuntimeLanguages(config.languages)` em mls-102033) não achava `pt-br` nem
  o prefixo `pt`, caindo em `keys[0]` silenciosamente. Corrigido nos DOIS caminhos de geração do
  l2_shared: `cfeSharedScaffold.renderI18n` (CLI/determinístico) passou a nomear o catálogo pelo
  `i18nMeta.defaultLocale` do defs, e o template da skill `genCfeSharedTs` (Studio/LLM) idem. A chave é o
  locale em MINÚSCULAS com `_`->`-` e **região preservada** — a mesma normalização do runtime, então
  config.json, `document.lang` e a chave do catálogo são sempre a mesma string. Nome do const = a chave
  com não-alfanuméricos como `_`. Verificado com o defs real do 102045: `en` -> `messages['en']`,
  `pt-BR` -> `message_pt_br`/`messages['pt-br']`, `en-AU` -> `messages['en-au']`, defs sem i18nMeta ->
  `en` (fallback). Por que região importa: `languageKeys` colapsa para 2 letras, e um módulo pode
  declarar `en` E `en-AU` juntos — colapsados eles viram um só e a variante regional desaparece; daí o
  novo `runtimeLocaleKey`/`runtimeLocales` no cfeCreateShared.

- 2026-07-28 (deterministic l2_shared scaffold — kills the output-size wall) — run03 postmortem
: projectDetail (157KB defs, 19 operations) needs a ~55k-token.ts in ONE
  tool call; grok-4.5 aborted at the proxy 300s timeout and the minimax fallback capped at 32k output, so
  the whole task died. Root insight: the shared base class is a mechanical projection of defs + contract
  (the audit of the 8 mls-102045 goldens found ZERO functions needing judgment — business calc lives in l4).
  New `helpers/cfeSharedScaffold.ts` (pure, import-free so plain-tsx CLI can load it) renders the full class
  deterministically; on an unmodeled defs shape it returns `{code:null, reason}` and the caller falls back to
  the LLM path. Wired into the Node CLI (`nodejsMaterializeL2.ts materializeSharedDeterministic`); Studio's
  `agentCfeMaterializeGen` still uses the LLM for l2_shared — wire it with the pages session. Validation:
  the 9 buildFlowFsm shared files regenerate deterministically (~29-260KB) and pass strict tsc + their
  generated typecheck tests; full mls-base tsc clean; CLI run `102045 buildFlowFsm --only l2_shared --force
  --check` = 9/9, zero LLM cost. Found in passing: the defs generator can name an input state equal to
  another action's methodName (updateWorkTask.status -> `updateWorkTaskStatus` vs operation
  updateWorkTaskStatus) — a collision no generation can compile past (the typecheck test asserts both
  names); the scaffold now bails on it with a precise reason and projectDetail.defs.ts was patched locally
  (`updateWorkTaskStatusValue`). Upstream naming-dedup fix landed the same day in cfeCreateShared via
  helpers/cfeMemberNames.ts (see steps/create-contract-shared/CHANGELOG.md). `_calc` companion
  (LLM-filled pure functions) deliberately NOT built: no current defs marks derived computations — add the
  `l2_calc` pipeline item type only when a real case appears.

- 2026-07-28 (verify trace/verdict: no project-root fallback) — follow-up to the 22/jul module-scoping fix
. Two residual defects let the project root be polluted again:
  `saveMaterializeVerifyTrace` did not receive the caller's module (it re-derived one from the BROKEN items
  only, while `runVerify` already computes `moduleName` from ALL items and passed it to the verdict), and
  BOTH writers fell back to the bare `trace/frontend-materialize-verify` folder at the l2 root when no
  module could be derived. Fixes: the trace signature now mirrors the verdict —
  `saveMaterializeVerifyTrace(moduleName, planId, attempt, broken)` with `deriveTraceModule(broken)` kept
  only as a fallback for callers without it; and the root fallback is REMOVED from both — with no derivable
  module the write is skipped (`console.warn` + `return null`, already a tolerated best-effort outcome)
  instead of polluting `l2/trace`. Guard test asserts both signatures, the absence of the bare-root folder
  in either writer, and that the phase passes its moduleName to the trace. Also cleaned the committed junk
  in mls-102051 (`git rm -r l2/trace`, staged): the 3 pre-fix JSONs (savedAt 2026-07-23T01:0xZ) all had an
  identical module-scoped copy under `cafeFlow/trace/frontend-materialize-verify`, so nothing was lost —
  `obj/source.zip` still carries them until `pnpm buildCI` is re-run in that project.

- 2026-07-27 (systemic-failure guard: stop instead of repairing an environment fault) — 102051 run01: the
  Studio compiler could not resolve the bare `lit` import (TS2792), so EVERY generated file was "broken"
  on every round. Consequences: the broken set never shrank (pages 12->12->12->11, shared 6->6->6->5), the
  whole repair budget was spent regenerating files that were ALREADY CORRECT, and the rounds REGRESSED
  them — page21 kitchenWorkspace/dashboardWorkspace had ZERO real errors at attempt 1 and finished with 6
  (invented `updatedAt`) and 1 (wrong `alert` shape); stockManagement gained `.id`; and two shared files
  had their `lit` import rewritten by the repair LLM to Studio-only paths (`/_102029_/l2/lit/decorators.js`,
  `/_102029_/node_modules/lit/decorators.js`) that break the real tsc. In other words the repair loop was
  the CAUSE of the surviving tsc errors, not a failed cure. New guard `isSystemicPageFailure`
  (cfeMaterializeCore): when the FIRST compile (attempt 1) finds EVERY page11 item broken and there are at
  least SYSTEMIC_FAILURE_MIN_PAGES (3) of them, runVerify returns `failed` with MATERIALIZE-SYSTEMIC-FAILURE
  and does NOT start repair rounds — 3+ primary pages failing at once is an environment/config fault, not N
  independent code bugs. Deliberately narrow: only attempt 1 (a repair round never trips it), only page11
  (page21 is the experimental genome), min 3 pages (a 1-2 page module never trips), non-page phases
  ignored. The trace + verdict files are still written first, so the diagnosis survives the stop. Verified:
  6 unit tests for the guard's boundaries + replay of run01's REAL attempt-1 data (12 items / 6 page11 ->
  guard trips; same data as a repair round -> does not trip; run20's all-clear -> does not trip).

- 2026-07-23 (verify: reliable cross-file typecheck + always-written verdict + 3 rounds) — 102051 run19:
  shiftWorkspace passed the in-run verify yet failed `tsc -p` (TS2554/TS2352/TS2339). Root cause: the
  Studio per-file `compile` resolves an import to `any` when the dep model is not loaded, so cross-file
  errors vanish — and because the verify item set only SHRINKS (each round gets only the prior `broken`),
  a false-negative in round 1 is dropped forever. Fixes (agentCfeMaterializePhase + cfeCreateShared):
  (1) `verifyItem` now force-compiles a page's dependency .d.ts (shared base .ts + contract .ts, via
  getCompiledDtsByMlsPath) BEFORE compiling the page, so the per-file compile resolves cross-file types
  like `tsc` — reliable from attempt 1 (NOT weak-first/strong-last, which the shrinking set makes unsafe).
  (2) `saveMaterializeVerifySummary` ALWAYS writes one stable-named `<phase>-verify-summary.json`
  (module-scoped, overwritten each round) listing passed + still-broken — so "was it resolved?" has one
  place to look instead of inferring from absent per-round trace files. (3) MATERIALIZE_REPAIR_ROUNDS 2->3
  (Studio now diverges from the CLI's 2 on purpose — see the comment). CAVEAT: all new code runs only in
  the Studio in-browser compiler; it compiles + passes the unit suite here but its EFFICACY (does priming
  a dep's .d.ts actually make the page compile resolve it?) is confirmable only by re-running (run20).
  Watch-list if it still leaks: getCompiledDtsByMlsPath skips recompile when prodDTS is cached (may be
  stale/pre-repair); pages-phase dependsOn is the shared FANOUT, not shared verify/repairs (a page can be
  verified before the shared base is final). Escape hatch: use compileAll(project) at exhaustion to
  populate the summary's broken-list authoritatively.

- 2026-07-22 (generated typecheck tests: alias imports + unprefixed contract types) — 102051 run18: the
  deterministic typecheck tests (buildContractTypecheckTest/buildSharedTypecheckTest in cfeMaterializeCore)
  emitted RELATIVE imports (`./x.js`, `../contracts/x.js`) which the mls runtime/tsc cannot resolve, and
  referenced MODULE-PREFIXED contract DTO types (`CafeFlowListMenuItemsInput`) while the contract .ts
  (genCfeContractTs) and every runtime consumer (shared re-exports, page renders) use UNPREFIXED names
  (`ListMenuItemsInput`). Result: web/shared/*.test.ts failed to compile (relative-import resolution +
  42 "no exported member" errors); the runtime .ts had 0 errors, confirming unprefixed is canonical.
  Fixes (all in agentChangeFrontend): new `aliasJsImport` builds `/_<project>_/l2/...js` from the mls
  path for the self-import and the contracts import (replaces relativeJsImportPath); contract DTO type
  names dropped the module prefix (Base class name stays prefixed — it is exported prefixed and compiles);
  genCfeContractTs skill doc updated to mandate unprefixed `{CommandPascal}Input/Output/OutputItem`. Guard
  test added (cfeL4Contract.test.ts) asserting generated imports are alias-form + non-relative. The 6 stale
  102051 shared tests were regenerated deterministically → whole 102051 now compiles (0 errors).
- 2026-07-22 (materialize-verify trace is module-scoped) — saveMaterializeVerifyTrace wrote to the project
  root `l2/trace/frontend-materialize-verify` (rationale: "a phase spans every module"), but a run now
  processes ONE module, so the trace escaped the module folder (102051 run18: mls-102051/l2/trace/...).
  It now derives the module from the broken items' paths and writes under `<module>/trace/...`.

- 2026-07-16 (fix — contract typecheck drift + repair fan-out + prompt-as-data): (1) buildContractTypecheckTest now honors canonicalOutputShape when present (kind object/list/paginated; OutputItem asserted only for kind 'list') and fieldType builds nested object types from field.item.fields instead of unknown[] — the run16jul_b failure mode: the skill (genCfeContractTs, updated 16/jul) instructs typed named-interface arrays while the test expected unknown[] under exact Equal<>, so ALL contract repairs were unwinnable (12x TS2344 + 2x TS2724 left red in mls-102049 petShop; tests regenerated, mls-base tsc clean). (2) Repair rounds are now parallel fan-outs (repair1/repair2, planId `{verifyPlanId}-repair{round}`) whose args carry ONLY {planId, defPath, attempt}; agentCfeMaterializeGen recomputes the compiler errors from disk (computeRepairHint, attempt >= 2) and the hint travels in the LLM input (stripped by the interaction cleaner) — the old shape persisted repairHint in step prompts, which the cleaner keeps, risking the DynamoDB 400KB task cap; prompt_ready args are likewise stripped of any legacy repairHint. Fan-out slots are also deleted on completion, unlike the old per-item repair steps. (3) Context diet extended: _102029_ runtime deps of shared items are sent as compiled.d.ts (buildRuntimeDtsSection; raw sources were ~8k tokens per shared call), and trimDefinitionForPrompt now drops 'origin' for l2_shared too (~13% of the shared definition). Analysis:
- 2026-07-16 (perf — parallel slots 5 -> 10): raised the fan-out `maxParallel` default from 5 to 10 across agentChangeFrontend (materialize dispatcher `agentCfeMaterializeL2.ts`, phase `agentCfeMaterializePhase.ts`, and the `createAddStepIntent` default in `helpers/cfeCreateShared.ts`), plus the four fan-out declarations and the note in `flow.json`. Matches agentChangeBackend (already 10 in cbShared). Studio-declared per-step overrides still win (agentCfeMaterializePhase parses an explicit maxParallel).
- 2026-07-13: documented current dispatcher/phase/worker behavior, dynamic planId conventions, and moved the materialization agents into this step folder.
- 2026-07-16 (v5 context diet — flow.json materializationContextPolicy): the page-materialization context was cut from ~80KB to ~18KB per page. (1) The shared base class is now sent as its compiled .d.ts INSTEAD of the raw .ts — persisted to trace/frontend-shared-dts/{page}.txt right after the shared materializes (persistSharedDtsArtifact); readers use fresh artifact -> compile-on-demand (Studio) -> raw .ts (CLI fallback). (2) Definition payload is trimmed for the prompt only (trimDefinitionForPrompt drops the 'sections' summary and 'origin'; the .defs.ts file keeps both). (3) designSystem.ts is summarized to its token-name list (buildContextSection; ~16KB -> ~1KB, state suffixes folded). (4) page dependsFiles no longer carry shared/contracts .defs.ts (see create-layout CHANGELOG). (5) genCfeSharedTs now emits one-line JSDoc per member (state/action mapping, feedback keys, outputShape) and re-exports contract types, making the .d.ts self-sufficient; render skills read the mapping from JSDoc instead of shared .defs.ts and import DTO types from the shared re-exports. Both runtimes (agentCfeMaterializeGen and nodejsMaterializeL2) share the section builders in cfeMaterializeCore so the prompts do not drift. Verified: mls-base tsc clean; token extraction tested against 102051 designSystem.ts (110 keys -> 56 bases, 1004 bytes). Generation path NOT exercised — requires a full checkpoint run.
- 2026-07-16: page items now get the shared base class compiled .d.ts in context (msg-key closed vocabulary). 102051 run left strict-tsc errors in 3 generated pages: renders used this.msg keys that do not exist in the shared MessageType — invented ('lane.registered', 'empty.review') or abbreviated ('organism.dashboard.empty' vs 'organism.dashboardSummary.empty'). The raw shared .ts source was already in context but the LLM still guessed keys, and the Studio-side compile of the page did not always resolve the base class strictly enough to reject them (mls-base tsc, strict, does). Fix: (a) buildGenContext appends, for l2_page items, the compiled .d.ts (prodDTS) of every dependsFiles web/shared/*.ts via new cfeMaterializeStudio.getCompiledDtsByMlsPath — compiling the shared model on demand (mls.editor model -> mls.l2.typescript.compile) when prodDTS is absent; (b) page defs now carry msgKeys (sorted keys of the layout i18n) written by savePageLayoutDefs — a deterministic closed vocabulary that also reaches the CLI runtime, mirroring the fieldCatalog pattern that eliminated invented fields; (c) genCfePage11RenderTs/genCfePage21RenderTs now state that msgKeys is the closed key set and the .d.ts section is authoritative; labels without a key render from the data value, not a guessed key. CLI note: nodejsMaterializeL2 gets (b)+(c) only — (a) is Studio-only (needs the editor compiler); acceptable because msgKeys carries the same information deterministically.

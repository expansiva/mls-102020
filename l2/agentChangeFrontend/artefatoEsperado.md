# artefatoEsperado — o que um módulo gerado pelo CF DEVE ter no l2

> Modelo de expectativa para validação "expectativa × realidade". Escrito 24/08/2026 a partir do
> código real (flow.json + skills + helpers), com o flow.json corrigido onde mente (§6). Par deste
> arquivo no módulo validado: `l2/<moduleName>/README.md`.

## 1. O que o agente é

O CF é o reconciliador Stage-2 de frontend: lê o l4 (workspaces/ontologia/operations/contracts) e
o `l5/<module>/todoFrontend`, e para cada owner pendente cria contrato/shared/layouts, materializa
em `.ts` runtime, registra as páginas e assina o `l5/project.json`. O l4 é read-only; o agente é
idempotente (refaz só o stale/ausente) e fecha com um closing gate que compila o módulo INTEIRO.

## 2. Inventário esperado — `l2/<moduleName>/web/`

```
contracts/<page>.ts                        v2: cópia DETERMINÍSTICA do l4 (sem .defs.ts, sem LLM)
shared/<page>.defs.ts | .ts | .test.ts     base headless; .test.ts = type-assertions
desktop/page11/<page>.defs.ts | .ts | .test.ts    .test.ts = casos BFF declarativos
desktop/page21/<page>.defs.ts | .ts
desktop/page31/<page>.defs.ts | .ts               3º slot (MAX_UX_VARIANTS = 3)
desktop/<genome>/<page>_O<n>.ts            só quando a página foi dividida (organismos)
```

**Nenhum `.html` de página** (preview do Studio não usa iframe por arquivo). `/rebuild` e o
register soft-deletam resíduo antigo em `web/desktop|mobile/pageN`. Os shell templates
`l2/shared/spa|pwa/index.html` do runtime 102033 **não** são estes e continuam.

**Nenhum `.less`, nenhum `.css`** — estilo é utility class (Tailwind) + tokens
`var(--token, fallback)` do `designSystem.ts`, POR DESENHO (a regra ".less obrigatório" vale para
componentes de molécula escritos à mão, não para páginas geradas). Nenhum `.test.ts` em
page21/31 (`PAGE_TESTS_VARIANT = 'page11'` — decisão, não esquecimento).

### Papéis

- **contrato**: só DTOs + `export const <bffId>Route = '<module>.<ws>.<bff>' as const`. Enum vira
  união literal (nunca `string`); `enumLabels` NUNCA entra no tipo; em `paginated` a coleção mantém
  o nome declarado (nunca renomear para `items`).
- **shared**: `class <Module><Page>Base extends CollabLitElement` (light DOM —
  `createRenderRoot() { return this }`), headless: states `@property`, actions via
  `execBff(routeConst, params, {mode})`, sem `render()`, sem i18n, sem `@customElement`. JSDoc de
  uma linha por membro (o `.d.ts` compilado é o contexto do LLM da página).
- **página**: `@customElement('<module>--web--desktop--page<NN>--<page-kebab>-<project>')`;
  esqueleto determinístico (header, imports, bloco i18n, tag, classe) + LLM só preenche renders.
  Só métodos de render — sem `@property`, sem mutação de estado.
- **page11** = baseline operacional. O `.defs.ts` emite `export const definition = \`…prosa…\``
  (o que a página faz, para quem, motivação, e que **estende o shared** — sem campos e sem rotinas)
  mais o irmão `export const bindings = […] as const` (só o código determinístico lê: gates e
  split plan). A prosa entra no prompt do materialize verbatim; `bindings` nunca vai no prompt.
  Estrutura (states/actions/handlers) vem do shared em `dependsFiles`. `baseClassName` o
  esqueleto tira do shared defs.
- **page21/31** = goal-first (`pageObjective`, botões contextuais por transição de lifecycle —
  nunca `<select>` de enum). O `definition` **continua objeto** (`pageId`, `dataBindings`,
  `pageObjective`, …) — só o page11 mudou.

## 3. BFF do lado do cliente

Só o shared chama o backend. `execBff<TOutput>(routine, params, options)` com o **route const do
contrato** (nunca string literal); envelope `{ok, data, error}` nunca vai inteiro para um state;
`meta.userId` é injetado pelo `bffClient` a partir do cookie `loginUser` — **nenhum gerado emite id
de usuário como input editável**. Testes: 1 caso ok por rotina + 1 caso de validação por campo
obrigatório de command; `<seedRef>` só para id que alguma query do módulo produz; demais campos
recebem literais determinísticos (`'teste'`, `1`, `'2026-01-01'`, ISO datetime).

## 4. i18n (as regras que mais quebram)

- Catálogo **só nos arquivos de página**, entre `/// **collab_i18n_start**` e `**_end**`; um
  `pageMessage_<locale>` por locale; paridade garantida pelo COMPILADOR (default sem anotação
  define o tipo; os outros levam `: PageMessageType` → TS2741/TS2353).
- **O locale default vem do l4** (`localization.defaultLanguage`, fallback
  `designContext.userLanguage`); `'en'` é só último fallback. Módulo pt-BR ⇒ catálogo pt-BR. A
  regra é "nada de literal solto", não "tudo em inglês".
- Texto traduzido na versão anterior do arquivo é carregado POR CHAVE ao regenerar (tradução manual
  nunca é derrubada).
- Enum na tela: `enumDisplayOptions(codes, labels)` ⇒ `{value: CÓDIGO, label: rótulo}` — o fio
  carrega sempre o código; sem rótulo no l4, fallback é o próprio código. Célula de lista: o
  rótulo (`enumDisplayLabel`), nunca o código cru. Coluna `*Id` não é default quando title/name
  já identifica a linha.

## 5. Gates

1. **Por fase** (`materialize-phase-*-verify`): compile do output + do `.test.ts` companheiro, com
   pré-load dos `.d.ts` (sem isso import não resolvido vira `any` e esconde erro).
2. **Textuais de página** (só `l2_page`): higiene de template (função pintada por nome), campo fora
   do contrato, tag divergente do path, token `-bg` como cor de texto, vocabulário técnico na tela,
   disciplina de headings, feedback de mutação, `@chartclick` morto, enum ligado a `<input>` de texto,
   célula de enum com código cru, coluna `*Id` ao lado de title/name. Os 6 gates ancorados em
   `dataBindings` (`collectPageExperienceIssues`, seleção, botão disabled, feedback de mutação,
   initialLoad, vocabulário técnico) leem o objeto do page21/31 ou o irmão `bindings` do page11 —
   nenhum vira no-op porque a prosa substituiu o `definition`. `collectMissingImageRenderIssues`
   continua regex no texto bruto do `.defs.ts` (agora prosa + JSON de `bindings`); campo de imagem
   que só existe no shared/contrato já não aparecia no defs reduzido.
3. **Closing gate** (`finalize-create`): compila o módulo INTEIRO; 1 repair por arquivo, máx 2
   rodadas; handoff para `agentAddLanguage` só depois do verde.
4. **Árbitro final é o `tsc` real do `mls-base`**, não o gate do Monaco (configs divergem;
   incidente documentado em fixture).

## 6. Onde o flow.json MENTE (conferido 24/08)

- `genomePolicy` diz "MAX_UX_VARIANTS=2 / page31 deprecated": o código vivo é **3 slots**
  (`cfeCreateShared.ts:4476`) e projetos novos têm page31.
- A base é `CollabLitElement` (102029), não "StateLitElement".
- Steps `create-layout-phase/`, `reconcile-shared-phase/`, `rebuild-defs-cleanup/` existem e não
  estão no `steps[]` do flow.json.

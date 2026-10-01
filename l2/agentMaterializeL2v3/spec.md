# agentMaterializeL2v3 — spec

> **Rascunho v0, 01/10/2026 (planner).** O código ainda não existe além de `helpers/`. As etapas marcadas
> **PENDENTE** dependem de perguntas em aberto e não entram em spec de implementação antes da resposta. O
> controle do projeto fica em `todo/agent-materializel2-v3/`. As decisões citadas (`D-xxx`) estão em
> `todo/agent-materializel2-v3/docs/decisoes.md`.

## 1. O que o agente faz

O agente lê os defs v2 de um módulo, já finalizados pelo `agentDefsL2` (contrato, shared e page11
desktop/mobile), e gera o código do frontend no projeto cliente, nesta ordem: **contrato → shared → páginas**
(briefing `mls-102047/materializadorL2.md` §3). Ele substitui o `agentMaterializeL2` em função. O agente antigo
continua no disco e não é alterado (D-003).

Ele **não** gera nem corrige defs (o dono é o `agentDefsL2`), **não** toca no backend e **não** escolhe
molécula: usa a tag que o page11 dá.

## 2. Invocação

```
@@agentMaterializeL2v3 <module> [/pages <pageId>[,<pageId>…]] [/devices desktop|mobile|desktop,mobile]
```

- Sem `/pages`, materializa todas as páginas do último `finalize80` do módulo. Sem `/devices`, os dois devices.
- O bootstrap é determinístico (`skipRootLLM`, como o `agentDefsL2.ts`): o root não chama LLM, só valida a
  invocação, fixa o `runDir` (D-006/D-007: `m3NewRunDir(now, listM3RunDirs(...))`) e cria os steps planejados.
- Todo step recebe no `prompt` o JSON `{ project, module, pages, devices, runDir }`. Nenhum step recalcula o
  `runDir`.

## 3. Entradas (só leitura)

| o quê | onde (`_<p>_/l2/<module>/…`) | para quê |
|---|---|---|
| relatório do `agentDefsL2` | `pipeline/agentDefsL2/finalize80/report.json` | exige `status: complete` e `compilation[].status: passed` |
| posse dos defs | `pipeline/agentDefsL2/finalize80/ownership.json` | lista de páginas e `sha256` de cada um dos 4 defs (`contract`, `shared`, `desktopPage`, `mobilePage`) |
| defs v2 | `web/contracts/<page>.defs.ts`, `web/shared/<page>.defs.ts`, `web/{desktop,mobile}/page11/<page>.defs.ts` | a fonte de verdade de cada página |
| catálogo de moléculas | `mls-102040/l2/molecules/<grupo>/index.defs.ts`: entradas `{ tag, module, … }` (T03) | tag → módulo de import |

Os arquivos do `agentDefsL2` são **dados**, não código (`skills/agentCodeIsPrivate.md` regra 3). O v3 não
importa nada da pasta do `agentDefsL2`.

## 4. Saídas

No projeto cliente, para cada página e device selecionados:

| arquivo | etapa | gerado por |
|---|---|---|
| `web/contracts/<page>.ts` + `<page>Receipt.json` | contracts30 | código (D-008) |
| `web/shared/<page>.ts` + `<page>Receipt.json` | shared40 | LLM + gates |
| `web/<device>/page11/<page>.ts` + `.less` + `<page>Receipt.json` | pages50 | LLM + gates |
| `web/shared/<page>.test.ts` (formato monitor) | tests60 | **fora do 1º marco** |

Não existe `web/shared/<page>Dts.txt` (D-009): a superfície do shared é compilada na hora pelo pages50.

O trace fica em `pipeline/trace/agentMaterializeL2v3/run_<UTC>/` (D-006/D-007): `run.json`, `input.json`, um
arquivo por step, `degradations.json` e `summary.json`. Nada é apagado. **Temporário (D-009):**
`pages50/<page><Device>Context.json` com a superfície que a LLM recebeu, a retirar depois do aceite do 1º marco.

**Convenções de nome**, seguindo o que o agente atual já gerou e compila no `mls-102047/l2/agendaClinica`:

- o shared é `export class <Page>Shared extends StateLitElement`;
- a página é `export class <Page>Page11 extends <Page>Shared`, com `@customElement` pela regra
  `convertFileToTag` do mls-102041;
- os ids de state e de função são **exatamente** as chaves do shared defs (L1, L2).

## 5. Etapas

`entry10 → input20 → contracts30 → shared40 → pages50 → finalize90`. O `tests60` fica fora do 1º marco. Cada
step, ao concluir, adiciona o resultado com `planId: <step>-done`, e o próximo depende dele (o padrão do
`agentDefsL2`). Os fan-outs usam `executionMode: parallel_dynamic`, `executionHost: client`.

### entry10, determinístico

Valida a identidade, confere que `runDir` não existe e grava `run.json` (identidade, `startedAt`, comando). Se
falhar, o step falha com o motivo.

### input20, determinístico

1. Lê `report.json` e `ownership.json`. Exige `status: complete`. Uma página pedida em `/pages` que não está no
   ownership é recusada com nome.
2. Para cada página: os 4 defs existem e o sha256 bate com o ownership. Divergência é **drift**: falha com o
   arquivo e os dois hashes, e não segue.
3. Para cada página, o conjunto de chaves de `<Page>Contracts` (último segmento da rota) é **igual** ao de
   `requests` do shared defs (D-008). Conferido em 01/10 nas 2 páginas do controleEstoque.
4. Resolve cada tag de molécula do page11 de cada device para o módulo de import pelo catálogo do 102040 (L7). Uma
   tag sem módulo é achado nomeado e falha a página.
4b. Confere que o template de `template.category` existe e que o título dele cita a `template.experience` (D-010).
5. Grava `input.json` com páginas, caminhos, hashes e o mapa tag → import. É o único contexto que os steps
   seguintes leem do disco além dos defs.

### contracts30, determinístico (D-008)

Para cada página: gera `web/contracts/<page>.ts`, um cliente tipado sobre `execBff`, com uma função por rota,
`input: C[K]['input']` e retorno `Promise<BffClientResponse<C[K]['output']>>`. A saída é texto fixo de um
template puro (`renderM3ContractClient`, golden byte a byte), já com o cabeçalho e o marcador de posse: o
agente não normaliza nem formata. Grava só se o conteúdo mudou, **sem modelo e sem compilar**
(`saveArtifactTextByMlsPath`, D-011), e prova a compilação no Studio com o `m3CompileProof`, que lê arquivo novo
pelo `getContent()` (D-012). Grava o receipt (`m3Receipt`).

- Posse: um `contracts/<page>.ts` sem o marcador do v3 não é sobrescrito (`M3_FOREIGN_FILE`).

- Gate: o conjunto de funções exportadas é igual ao de `requests`; a compilação dá 0 erros.
- Erro aqui é **defeito do agente**, não da página. Não tem reparo por LLM: falha com nome.
- Reuso: com receipt fresco (`m3ReceiptFresh`), não grava nem compila. O trace distingue `written`, `unchanged`
  (`.ts` igual, só o receipt gravado) e `reused`.
- **Provado no Studio em 01/10** (m3_02 a m3_04, `controleEstoque/produtos`): arquivo novo, reuso e falha com
  summary completo.

### shared40, LLM por página (dispatcher + worker, `modelType: code`, `x-tool-strict: true`)

O worker recebe o shared defs, o contract defs, as assinaturas do cliente gerado no contracts30 e a skill de
geração do shared. Ele devolve o `.ts` completo por tool call. Depois vêm os gates determinísticos:

1. as chaves de `states` e `functions` do defs existem com o mesmo nome na classe (L1, L2);
2. as chamadas BFF passam só pelo cliente de `contracts/<page>.js`, sem `execBff` direto;
3. `entry.params`: a URL vence o localStorage, a chave é `<mod>.<pageId>.<param>`, a conversão de tipo é real e
   os `persist` são gravados (briefing §5), conferidos como invariantes de texto e de AST;
4. o comando atualiza os states pelo retorno, sem chamar `load` de novo (briefing §4);
5. imports normalizados, cabeçalho, formatação e compilação no Studio com 0 erros.

O reparo usa orçamento de 2 rodadas (`m3CompileRepair`, `MAX_MODULE_COMPILE_REPAIRS`) com os erros recalculados
do disco. Esgotado o orçamento, a página falha com nome. Toda falha, inclusive antes de gravar, vai para
`degradations.json` (L4).

- **PENDENTE X3:** ligar `page<Lista>`/`pageSize<Lista>`/`hasMore<Lista>` à lista certa.
- **PENDENTE X6/X7:** o tipo de cada `source` de state e a tradução de `effect` (`select:` aponta para organismo,
  `filter:` aponta para state).
- **Decisão técnica aberta (planner):** o que é mecânico no shared (L3: entry params, persist, filter/loadMore,
  forms) pode virar esqueleto determinístico. **Proposta para o 1º marco:** a LLM gera tudo, os gates 1–4
  conferem a mecânica, e o esqueleto fica para depois, medido. O motivo é que o esqueleto do agente antigo
  (`cfeSharedScaffold`, 83 KB) parou de rodar sem registrar nada.

### pages50, LLM por página × device (dispatcher + worker, `modelType: design`, `x-tool-strict: true`)

O worker recebe o page11 defs do device, o `.d.ts` do shared **compilado na hora** no Studio (D-009: `prodDTS`
via `m3Studio`, sem arquivo e sem fallback para o `.ts` cru; sem `.d.ts`, a página falha com nome), o mapa
tag → import do `input.json` e o template do page11. O receipt da página inclui o sha256 do `shared/<page>.ts`.
Devolve `.ts` e `.less`. Gates:

1. a página não importa `bffClient` nem `contracts/`: só renderiza e chama o shared (briefing §3);
2. cada tag de molécula usada tem o import do mapa (L7). O import é **inserido por código** a partir do mapa, não
   pedido à LLM;
3. sem `static styles`. O `.less` vem sob o seletor do elemento e a cor de fallback não supõe tema;
4. textos em i18n com default `en` e paridade de chaves e tipos entre idiomas. O reparo não pode copiar o pt para
   o en (L9);
5. imports normalizados, cabeçalho, formatação e compilação no Studio com 0 erros.

O reparo segue as mesmas regras do shared40.

- O template é o arquivo de `template.category`, como está: o page11 apontar para um `page21.md` é intencional
  (D-010).

### finalize90, determinístico

1. Compila no Studio **todos** os arquivos gerados neste run, com `preloadStudioImports`. Um import não
   carregado nunca conta como limpo.
2. Confere que cada receipt está fresco.
3. Grava `summary.json` (`m3Trace.saveM3RunSummary`). O veredito é `completed` só com zero erro e zero página
   falha, e `degraded`/`failed` em qualquer outro caso, com os nomes. Não existe "verde com pendência" (L5). O
   resumo é sempre gravado, inclusive quando o run falha (L6).
4. Compilador indisponível **bloqueia**: nunca vale como aprovação (mesma regra do `agentDefsL2` finalize80).

## 6. Regras transversais

- **O agente roda no navegador**, sem Node no código dele. Imports absolutos `/…​.js`.
- **Código privado** (D-002, D-004): tudo fica em `agentMaterializeL2v3/`. Importa só os helpers que já existem
  (`mls-102035/l2/solution/studioCompile.js`, `l2/helpers/hash.js`, `libStor`, `aura/helpers/moduleLanguages`
  quando precisar, D-005). Não cria helper compartilhado.
- **Prompts são dados:** um `prompt.md` por step com LLM, com `<!-- modelType: … -->` escolhido por
  `skills/modelTypes.md`. Nada de prompt dentro de `.ts`.
- **Um step por pasta:** `steps/<id>/` com o hook, o `prompt.md`, os gates, os testes, o `readme.md` e o
  `CHANGELOG.md` (`skills/agentsBestPractices.md` §2). Dispatcher e worker ficam em arquivos separados.
- **Provar a versão pelo receipt**, nunca pelo mtime (L8).
- **Sem hard code** de módulo, página ou domínio. O `controleEstoque` é fixture, não regra.

## 7. 1º marco

`@@agentMaterializeL2v3 controleEstoque /pages produtos /devices desktop` termina `completed` no Studio, e
prova isso com o seguinte:

- `contracts/produtos.ts`, `shared/produtos.ts` e `desktop/page11/produtos.ts` + `.less` compilam no Studio com 0
  erros;
- os 3 receipts estão frescos e batem com os sha256 do ownership;
- o `summary.json` do run diz `completed`, com 0 degradação não explicada.

Pré-requisito de desenho: as X3, X6 e X7, que afetam o shared40 de `produtos` (paginação e `entry.params`).
A X9 foi resolvida pela D-009 e a X4 pela D-010. O contracts30 **não depende de nada em aberto** e pode
ser a próxima spec de implementação.

## 8. Histórico

| data | o quê |
|---|---|
| 01/10/2026 | rascunho v0 (planner): etapas, gates e pendências. Só existe `helpers/` (m3_01) |
| 01/10/2026 | D-009: X9 resolvida (sem `Dts.txt`, `.d.ts` compilado na hora, cópia temporária no trace) |
| 01/10/2026 | D-010: X4 resolvida (template `page21.md` intencional; input20 confere que existe) |
| 01/10/2026 | contracts30 implementado e provado no Studio (m3_02–m3_04); D-011 (gravar sem modelo) e D-012 (prova lê arquivo novo pelo `getContent()`) |

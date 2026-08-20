# agentCopyMolecule — spec (v1)

> Spec-first: o `flow.json` ao lado é o contrato máquina; este arquivo é a racional
> humana. Mudanças de comportamento alteram PRIMEIRO o `flow.json`, depois o código.
>
> **Este arquivo, o `flow.json` e os `CHANGELOG.md` dos steps são o registro do
> desenho — não há outro documento a procurar.** As decisões que governam o agente estão
> escritas aqui com o porquê, e as datadas ficam no `CHANGELOG.md` do step que elas afetam.

## Por que este agente existe

Decisão de reunião de **2026-08-18**: as bibliotecas base (`mls-102040`, `mls-102054`,
`mls-102055`) ficam **só em inglês**, e a tradução mora na **cópia**, dentro do projeto
do cliente. Este agente é o veículo dessa decisão — ele dá ao cliente o **código real**
da molécula, com o bloco `collab_i18n` no arquivo dele, para ele acrescentar o `pt` (ou
o que quiser).

A alternativa medida na análise era catálogo de runtime + migração de 137 moléculas +
mexida na classe base do `102029`/`102033` — o custo que a equipe recusou.

**A premissa foi verificada em código** (19/08): as **138** moléculas com bloco i18n
resolvem o idioma no `render()` (`const lang = this.getMessageKey(messages)`), não no
campo — então um bloco `pt` acrescentado na cópia realmente aparece na tela.

## O que ele faz

Copia, para o **projeto atual**, os 4 arquivos de uma molécula de um projeto de
dependência: `.ts`, `.defs.ts`, `.less` e `.html`. Aceita **uma** molécula, **um grupo
inteiro** ou uma **lista** de referências, na mesma menção.

**A cópia mantém o nome e a tag da origem** (`ml-combobox` → `ml-combobox`). Não há
sufixo, e isso não é descuido: `resolveNewTag` (`mls-102033/l2/utils.ts`) procura o
arquivo da tag em `[projeto atual, ...dependências]` **nessa ordem**, então a cópia
**sombreia** a base na resolução. É o mecanismo que o preview e o build já usam.

## O que ele NÃO faz (v1)

- **Não traduz.** A cópia sai crua, com o bloco `en` como está. Traduzir no ato, lendo
  os idiomas do projeto, é a evolução natural — e é v2.
- **Não gera nem atualiza o `index.ts` do grupo.** O index deste código-base é uma
  página showcase gerada por LLM, e copiar os side-effect imports dela é exatamente
  como se cria um `customElements.define` duplicado. Também não é necessário: o preview
  resolve a tag encontrada na página e gera o import dali (`buildFile.ts`). Quem quiser
  a página do grupo no destino roda o `agentUpdateIndexGroupPage`.
- **Não rebaseia.** "Re-copiar para atualizar da base" é v2; hoje *substituir* descarta.
- **Não propaga consertos da base** para cópias já feitas — é a contrapartida aceita.
- **Não altera a origem**, nunca. Nem o arquivo, nem o index do grupo dela.
- **Não é roteado** pelo New/Improve. Invocação manual, como o Variant.
- **Não copia o `.test.ts`.**

## Invocação

Duas portas, três formatos. Do **preview** (payload `{ fullName, page, prompt }`, como
o `agentNewMoleculeVariant`) e em **prosa** no collab-messages (como o
`agentImproveMolecule2`) — os dois declaram o mesmo `scope: ['l2_preview']`, então a
diferença está só no parser.

```
@@agentCopyMolecule copie o componente _102040_/l2/molecules/groupviewtable/ml-inline-edit-table

@@agentCopyMolecule copie os componentes do grupo _102040_/l2/molecules/groupviewtable

@@agentCopyMolecule copie os componentes abaixo:
_102040_/l2/molecules/groupviewtable/ml-inline-edit-table
_102040_/l2/molecules/groupviewchart/ml-bar-chart
_102040_/l2/molecules/groupenterboolean/ml-boolean-segmented
```

O parser extrai **todas** as referências da menção; a prosa em volta vira observação.
Referência **sem** o nome da molécula = grupo inteiro (expandido pela listagem do stor).
Menção **sem nenhuma referência completa** falha legível nomeando o formato esperado —
achar a molécula pelo nome curto é v2.

Destino = `mls.actualProject`, sempre. A origem precisa ser dependência declarada do
destino; na prática o teste é a legibilidade pelo `mls.stor`, porque um projeto que não
é dependência não tem molécula legível para copiar.

## Desenho (por que assim)

- **Verbatim é a regra, não otimização.** O corpo do arquivo nunca é reescrito, porque
  o bloco `collab_i18n` **é** o motivo da cópia: qualquer regeneração arrisca justamente
  o que o cliente pediu. As únicas edições são o `fileReference` do header e a linha
  `copiedFrom`. Por isso o gate do `c3` compara o bloco i18n **byte a byte**.
- **Zero LLM de geração.** A única chamada de julgamento é o summary (mais o `rootPlan`
  barato). É o agente mais determinístico da casa, e isso é consequência do ponto acima.
- **Sem exigir tema** — a diferença central em relação ao Variant, que exige
  `l2/skills/theme.ts`. Quem só quer o português não deveria ter de declarar um contrato
  de tema para obtê-lo.
- **Casca é achatada.** As 84 cascas do `102054`/`102055` herdam o `collab_i18n` do pai,
  então copiar a casca não resolveria nada. A cópia leva o **corpo do pai** com a
  **identidade da casca** — se levasse a identidade do pai, sombrearia a molécula base
  em vez da temática que o cliente usa. Profundidade de herança 1; casca de casca falha
  legível.
- **Fonte de cada arquivo no achatamento** (medido em 19/08): `.ts` do **pai** (com a
  identidade da casca), `.less` e `.html` da **casca**, `.defs.ts` da casca quando
  existir e, quando não, do pai com a linha `TagName` trocada. O ramo não é hipótese: as
  42 cascas do `102055` têm `.defs.ts`, e o `102054` tem **1 de 42**.
- **Colisão é decisão humana** — nem sobrescrita silenciosa, nem falha seca. O `c2` é o
  único ponto de parada do pipeline, e ele só para quando há algo a decidir.
- **Fail-fast na admissão**: o `c1` valida a **lista inteira** antes de escrever
  qualquer coisa e reporta **todos** os erros de uma vez. "Copiei 10 de 12" em silêncio
  é o meio-estado que já nos custou diagnóstico. Resultado parcial só existe quando o
  usuário o escolhe ("ignorar já existentes"), e aí é reportado item a item.
- **Congelamento é registrado** na linha `copiedFrom`, porque não se reconstitui depois.
  O relatório de drift no Improve ("a base mudou desde a cópia") é v2, mas o registro
  tem de nascer no v1.
- **Helpers próprios, nada promovido a `shared/`.** `cFs`/`cOrigin`/`cTemplates` são
  cópias adaptadas de `vFs`/`vOrigin`/`vTemplates` — o critério da casa para `shared/` é
  estreito (entra o que divergir seria defeito: contrato, fato de plataforma, subtileza
  que não pode derivar), e o precedente é replicar plumbing: `vFs`, `ntFs`, `nmFs` e
  `imResolve` são quatro helpers de fs, cada um dizendo *"pattern: vFs.ts"*. Consequência
  boa: **o `agentNewMoleculeVariant` não é tocado em nenhuma linha.** De `shared/` só se
  consome o que já está lá: `mentionEntry`, `widgetDecisionClarification` e `llmTool`.
  ⚠️ Duplicar plumbing é seguro; duplicar **lição** não. O `cFs.ts` preserva a *re-run
  resurrection* do `vFs.ts` (arquivo apagado localmente fica no stor com
  `status: 'deleted'` e **nunca persistiria** em silêncio).
- **Toda saída emite âncora**, inclusive as que não escrevem nada: o `c2` sem colisão
  auto-completa e emite `c2-done`. Caminho que não escreve e não ancora é como um run
  fica verde e pendurado (`agentImproveMolecule2/steps/i4-inherit`, 2026-08-10).

## Fluxo

```
root (rootPlan barato: idioma + títulos + runKey)
  └─ c1-bootstrap  (sem LLM) admissão da lista inteira + context.json
      └─ c2-clarify  (checkpoint; sem colisão, auto-completa)
          └─ c3-copy  (sem LLM) .ts + .defs.ts
              └─ c4-less  (sem LLM) .less
                  └─ c5-demo  (sem LLM, não bloqueia) .html
                      └─ c6-summary (LLM general) resumo + avisos
```

Steps determinísticos **não têm retry**: falham legível na hora. O lote **não faz
fan-out** — `c3`, `c4` e `c5` iteram sobre `context.items` dentro do mesmo step.

## Aceite (controle Fase 5)

1. **O teste da premissa**: copiar `ml-upload-file-list` (só `en`, e as chaves `addFiles`,
   `dropHere` e `noFiles` são TEXTO VISÍVEL no estado padrão), acrescentar `pt` ao `collab_i18n`
   da cópia e ver o português com o runtime em `pt` — sem index nenhum. Não usar
   `ml-indeterminate-spinner` para isto: a única chave dela vira `aria-label`, invisível na tela.
2. Casca achatada (`ml-button-standard-brutal`): código real do pai sob a identidade
   brutal, com o `.less` brutal.
3. Colisão single: substituir / cancelar / renomear.
4. Falhas legíveis: origem não-dependência, origem inexistente, casca de casca, menção
   sem referência.
5. Shadowing na prática, e o define duplicado provocado de propósito (é o que dá a
   redação exata do aviso do `c6`).
6. Grupo inteiro (`groupviewtable`, 12 moléculas = 48 arquivos).
7. Lista mista de 3 grupos; e com uma referência inválida no meio ⇒ fail-fast.
8. Colisão em lote: as 3 políticas globais.

**Pré-condição de ambiente**: o projeto atual precisa ter a origem como dependência e
oferecer `pt` no seletor de idioma do preview — que vem do **módulo**
(`l4/<module>/module.defs.ts`, via `readModuleLanguages`), não do `l5/project.json`.

**Regressão**: zero arquivos alterados fora desta pasta (implementação) e fora do
projeto de destino (execução).

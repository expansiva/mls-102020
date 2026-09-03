# CHANGELOG — c3-copy

## 2026-08-19 — nasce (Fase 3 do controle)

- **verbatim é a regra**: só header + `copiedFrom` + identidade nos dois caminhos que precisam;
- **gate compara o bloco `collab_i18n` byte a byte** entre fonte e cópia — é o motivo do agente
  existir, e é a checagem que justifica o step ter gate próprio;
- **identidade da casca no achatamento** (achado 7bis do controle): corpo do pai, tag e classe da
  casca; o gate falha se a tag do pai sobrar;
- **fonte do `.defs.ts` por projeto**: da casca quando existe (as 42 do 102055), senão do pai com
  `TagName` trocado (41 das 42 do 102054);
- **renderiza e passa pelo gate TODOS os itens antes de escrever o primeiro byte** — lote que
  falha no meio é meio-estado;
- `.defs.ts` ausente em toda a cadeia é **aviso**, não falha: o contrato não acompanha, a cópia sim.

## 2026-08-20 — a armadilha da tag-prefixo (achada pelo gate.test)

O gate checava a tag do pai com `writtenTs.includes(parentTag)` — e **falhava em toda casca de nome
convencional**, porque a tag da casca TEM a tag do pai como prefixo:
`grouptriggeraction--ml-button-standard` está dentro de `…-brutal`. O mesmo defeito existia nas
substituições (`split/join`), onde teria produzido `…-brutal-brutal`.

Agora toda substituição e toda checagem de tag passa por `cTemplates.replaceTag` /
`cTemplates.containsTag`, que só casam a tag quando ela **não** está colada a mais caracteres de tag
(`(?<![a-z0-9-])TAG(?![a-z0-9-])`). Vale para o `.ts`, o `.less` e o `.html`.

Achado pelo teste de aceite do achatamento, escrito antes de rodar o agente — que é o argumento para
o gate ter teste próprio.

## 2026-08-20 — o gate do i18n virou contrato de entrega

Nada mudou no código: mudou o PESO. Com a tradução passando para outro agente do Studio, o
`i18n_changed`/`i18n_lost` deixou de proteger apenas "o motivo da cópia" e passou a ser o contrato
entre os dois agentes — o bloco que o próximo agente vai editar tem de chegar idêntico ao da base.
Registrado para que ninguém relaxe essa checagem achando que é zelo estético.

## 2026-08-27 — escreve, mas não compilava nem publicava no cache

Achado comparando o `102040` (onde a molécula nasce, correto) com o `102053` (recebe por cópia,
sem borda de botão): fonte idêntica, comportamento diferente — a única diferença era o arquivo
nunca ter sido compilado no destino. `n4-render`/`n3-defs` (`agentNewMolecule2`) compilam o `.ts` e
o `.defs.ts` que escrevem; este step só escrevia.

Depois de cada escrita, o step agora chama `cCompileAndPublishTs` (novo em `cFs.ts`):
`mls.l2.typescript.compileAndPostProcess(model, runAfterCompile, true)` — o MESMO caminho que o
editor usa ao salvar (`mls-100554/l2/serviceSource.ts:1352`), com `saveCache:true`. `runAfterCompile`
é `true` no `.ts` (dispara `enhancementAura.onAfterCompile` → injeção de estilo — sem efeito ainda
aqui, porque o `.less` só existe depois do `c4-less`, que republica) e `false` no `.defs.ts` (é
contrato, não componente).

Erro de compilação agora falha o step (`compile_ts`/`compile_defs`), em vez de completar como
sucesso com um arquivo quebrado no destino — o `.defs.ts` ausente continua sendo só aviso, isso não
mudou.

- **2026-08-27 (2ª)** — ⚠️ **DUAS COMPILAÇÕES CONCORRENTES no mesmo model — o conserto de hoje de manhã
  tinha criado uma corrida.** Run real de Studio (`run-20260827163406.5225`, copiando
  `ml-datetime-picker` para o 102053):

  ```
  compile_ts:   … compilação falhou sem erro relatado
  compile_defs: … compilação falhou sem erro relatado
  ```

  O `c3-copy` abortou, e por isso **o `c4-less` e o `c5-demo` nunca rodaram** — nem `.less` nem `.html`
  foram copiados. O sintoma que o usuário viu ("o .html não foi copiado") é consequência, não causa.

  **O que prova que é mecânico e não de conteúdo:** o `.defs.ts` copiado tem **zero imports** e é só
  `export const` de dados. Não há como ele falhar ao compilar de verdade — e falhou **igual** ao `.ts`.

  **A causa:** o `writeStorTextAtomic` deste agente passava `awaitCompile: false` ao `createStorFile`.
  Para um arquivo NOVO, isso dispara uma compilação **não aguardada**, e o `cCompileAndPublishTs` logo em
  seguida roda uma **segunda** compilação no mesmo model. O `compile()` faz curto-circuito em
  `modelVersion === model.getVersionId() && !modelNeedCompile` — estado que é setado no **início** da
  compilação em voo, antes de os diagnósticos chegarem — então uma das duas perde e volta com
  `compilerResults.errors` vazio. O `nmFs` do `agentNewMolecule2` documenta exatamente essa corrida.

  **O conserto:** `compileOnCreate = false` nas duas escritas do `c3`. Passa a haver **uma única**
  compilação — a explícita, que é também a única que salva o cache. O `agentNewMolecule2` resolve a mesma
  corrida pelo outro lado (amarrando `awaitCompile` a `needCreateModel`) porque lá o arquivo **já existe**
  quando um passo o escreve, e o `createStorFile` nunca é alcançado; aqui todo arquivo de destino é novo,
  então o create é justamente de onde vem o segundo compilador.

  O `.html` do `c5-demo` mantém o padrão anterior — é a única compilação que ele tem.

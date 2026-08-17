# CHANGELOG — i2a-definition

## 2026-08-14 — a rota A deixou de ser um handoff e passou a ser uma edição

O passo nasceu em 06/08 como `i2a-rebuild-handoff` e nunca foi construído. O `flow.json` o registrava
com um `openQuestion`: *"como o gate de colisão do NM2 é satisfeito numa reconstrução — ou o NM2 ganha
um contrato de entrada de update, ou o handoff escreve num caminho de staging"*.

**A pergunta estava errada.** Ela pressupunha que uma mudança de definição é uma reconstrução, e foi
essa premissa que travou a rota por oito dias.

### O que a premissa custava

Entregar ao NM2 a partir do `n2-plan` significa passar por `n3-defs`, `n4-render`, `n5-less`,
`n6-demo` e `n7-index` — **regenerar a molécula inteira para adicionar um slot**, descartando um
contrato aprovado e uma implementação que funciona. É exatamente o que o `i3-edit` decidiu não fazer em
06/08, com o argumento no CHANGELOG dele: o histórico do `n4-render` mostra retries voltando como
arquivos diferentes e mais curtos.

E as duas saídas registradas custavam mais do que aparentavam:

- **contrato de update no NM2** — mexer no agente publicado de que depende toda criação de molécula, e
  ainda assim regenerar tudo;
- **staging** — tag, cabeçalho `/// <mls>` e entrada da index são **derivados do caminho**, então a
  molécula em staging registraria outro custom element e a promoção exigiria reescrever exatamente os
  arquivos que este agente evita reescrever.

### O que a rota virou

Um checkpoint, e mais nada de novo:

```
i2-triage → A → i2a-definition → i3-edit → i5-playground → i6-index → i7-summary
                (novo)           (existe)   (existe)        (existe)   (existe)
```

O `i3` já escrevia `defs` — está no `EDITABLE` desde 06/08. O `i5` já regenera o playground quando a
superfície se move. O `i6` já segue. **Faltava só um humano dizendo "sim, ela vai passar a prometer
isso".** O NM2 não participa, e o gate de colisão nunca aparece.

### Por que valia a pena construir

Uma mudança **intencional** do que a molécula promete não tem outro caminho, e é o que a consolidação
de tabelas pedida pela diretoria exige. Até este passo existir, o roteador falhava nesse pedido.

### A rota A é a única que alcança o `i5` e o `i6` — e essa afirmação foi e voltou duas vezes

Vale registrar as três versões, porque a diferença entre elas é sempre **contra o que se mediu**:

1. **"É a única"** — dedução: o `i5` e o `i6` decidem medindo a superfície, e toda movimentação de
   superfície é rota A.
2. **"Não é a única"** — varri as moléculas comparando a prosa do `.defs.ts` de cada uma com o próprio
   código, não achei nada, e concluí que o **contrato do grupo** era a fonte certa. Aí achei 27
   moléculas "sem slot que o grupo exige" e o `ml-currency-input` rodou o `i5` de verdade.
3. **"É a única, pelo que se mediu"** — e aqui está o porquê:
   - o run do `ml-currency-input` moveu a superfície **adicionando as propriedades públicas `label` e
     `helper`**, que o contrato do grupo não declara. O gate `definition_changed` do `i3` passou a
     recusar exatamente isso, então **esse caminho está fechado**;
   - a molécula **já declarava** `slotTags: string[] = ['Label','Helper']` antes do run. Meu
     levantamento usava um regex mais estrito que o do agente e não os via — o defeito dela era outro:
     slots declarados e nunca lidos;
   - as "27" são **26**, e o contrato do grupo é a **união das variantes**: 15 delas só não têm slots de
     variante-tabela e outras 10 não têm o `Detail` de expansão de linha. Quase todas são normais.

Uma movimentação de superfície legítima na rota B precisaria de uma molécula sem algo que o grupo já
nomeia **e** que ela deveria ter. Não há caso confirmado.

Consequência maior, que sobrevive às três versões: como o contrato do grupo fixa a superfície, uma rota A
legítima nesta biblioteca normalmente implica o **contrato do grupo mudar primeiro** — outro artefato,
fora deste agente e editado à mão.

### O desenho do checkpoint

**Uma lista, não um sim/não.** Um pedido implica mais do que a pessoa quis dizer com frequência — "quero
um rodapé" volta como um slot mais um evento mais uma propriedade de alinhamento. Cada linha se
desmarca sozinha; desmarcar todas desabilita o Confirmar, porque isso é um cancelamento e não uma
confirmação.

**`remove` e `rename` são estilizados à parte de `add`.** Uma adição é segura para toda página já
escrita; as outras duas quebram quem já escreveu. Dois cartões neutros para duas consequências
diferentes seria uma mentira contada em CSS.

**O gate pode checar mais que os gates de roteamento**, porque a superfície é medida: adicionar algo que
já existe é recusado — e a mensagem diz que isso é um **defeito**, e defeito é rota B —, e remover ou
renomear algo que a molécula não declara também. Roda duas vezes, na proposta do modelo e no que o
humano confirmou, porque ele desmarcou linhas e as duas respostas não são a mesma.

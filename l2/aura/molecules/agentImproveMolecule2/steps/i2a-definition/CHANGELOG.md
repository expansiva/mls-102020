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

### ⚠️ Uma correção, no mesmo dia, a uma afirmação mais forte que eu tinha escrito aqui

Este bloco dizia que a rota A era **a única** forma de alcançar o ramo ativo do `i5` e do `i6`. A
varredura que sustentava isso comparava a prosa do `.defs.ts` de cada molécula com o próprio código, e
não achava nada. **Ela usava a fonte errada.**

Quem enumera a superfície é o **contrato do grupo** (`skills/<grupo>/creation.ts`), em tabelas de
slots, propriedades e eventos. Medido contra ele: **27 moléculas não declaram um slot que o grupo
exige** — a `ml-currency-input` não tem `slotTags` nenhum onde o grupo exige `Label` e `Helper`.
Acrescentá-lo é conserto de **defeito**, portanto rota B, e **move a superfície medida**. Ou seja: o
`i5` e o `i6` são alcançáveis sem esta rota, e o teste que os exercita ficou mais barato e mais seguro
do que mexer na definição de uma molécula da biblioteca compartilhada.

Vale registrar a consequência maior: como o contrato do grupo fixa a superfície, uma rota A legítima
nesta biblioteca normalmente implica o **contrato do grupo mudar primeiro** — o que é outro artefato,
fora deste agente.

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

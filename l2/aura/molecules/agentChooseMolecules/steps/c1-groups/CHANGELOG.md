# CHANGELOG — c1-groups

## 2026-09-04 — capacidade não é região, e a manutenção da coleção entra na linha `need`

Terceira ocorrência do mesmo modo de falha, agora fora da bateria. O run `cadastro-usuarios`
(*"página de crud de cadastro de usuário: ver a lista, cadastrar, editar e excluir"*) voltou com **4
regiões**: a lista para `groupViewData` e um botão para cada verbo em `groupTriggerAction`. Cada escolha
isolada está correta; o erro foi cometido no corte — depois de levar `cadastrar/editar/excluir` para
regiões próprias, o que sobrou foi "exibir uma coleção", e nenhum nível 1 puxa isso para o grupo de
tabelas. O nível 2 do `groupViewTable` tem uma linha de cenário que é quase a transcrição do enunciado
(*"Fluxo completo de criação, edição e exclusão"*), e ela nunca foi lida porque o grupo nunca foi
escolhido.

Somando às duas ocorrências de 25/08 (V1, seleção da tabela promovida a região; V5, "e salva" promovido
a região), a **superdecomposição é o modo de falha recorrente deste passo** — e o contraexemplo M1
("*com* edição de quantidade na célula", que o c1 **não** promoveu) sustenta a hipótese registrada de
que o gatilho é a capacidade aparecer como **verbo**. Foi nela que as duas emendas pegaram:

- **`### What a component already does is not a region of its own`** — verbo que age sobre o conteúdo de
  uma região vizinha pertence àquela região. Três exemplos, um por gatilho medido (vírgula da V1, "e
  salva" da V5, os quatro verbos do CRUD deste run), e o critério positivo do que **é** região própria:
  componente que a tela teria de fato ao lado do outro. Ação sem coleção atrás segue sendo região;
- **dois itens novos na lista da linha `need`** — se a coleção é apenas lida ou também **mantida**
  (criar/editar/excluir) e **onde o registro abre** (na linha, em painel ao lado, em tela própria); e os
  verbos da própria região que o enunciado insiste (ordenar, paginar, selecionar vários, agrupar, editar
  na célula). O eixo "onde o detalhe abre" separa cinco moléculas do `groupViewTable` e é o mesmo que a
  V3 pedia (*"numa tela própria"*); o vocabulário `na linha / ao lado / tela própria` é o da análise do
  eixo de detalhe de registro.

**As duas emendas são uma só correção:** a informação não é descartada, ela **muda de lugar** — sai de
regiões fantasma e entra na linha `need`, que é o único canal que o c2 tem. Sem o segundo item, o
primeiro apagaria os verbos; sem o primeiro, o segundo não teria onde escrevê-los.

**O que isto NÃO conserta.** A linha de nível 1 do `groupViewTable` continua gastando metade do
orçamento com slot tags e não diz nada sobre manter registro — é a §12.7 da análise-mãe, e o conserto é
do **gerador** do catálogo, não deste prompt. As emendas melhoram a chance de o c1 casar com o grupo
certo (a linha do grupo diz "editable grid" e "isEditing propagation", a do `groupViewData` não fala de
edição), não a garantem. Enquanto o c1 devolver **um grupo só** por região (§12.3), todo erro dele
continua invisível e definitivo.

**Sem mudança no gate.** Contagem de regiões não é gateável sem opinar sobre a escolha, que é o que o
run mede. O que muda é o prompt; o que julga continua sendo a leitura do `report.json`.

## 2026-08-20 — o catálogo passou a ser DESCOBERTO, e não o do projeto ativo

Até aqui o catálogo era lido de `mls.actualProject`, o que só funciona rodando dentro do 102040. O uso
real é rodar do projeto do cliente (102053 e afins), onde as moléculas estão numa dependência: a
biblioteca base, um projeto de tema, ou o próprio cliente depois que uma molécula for copiada para ele.

- busca no **projeto ativo + dependências DIRETAS** (`prj_dependencies` das configurações do projeto).
  Não a lista transitiva: um cliente que depende de um tema não pode receber as moléculas da base
  através dele. As duas listas ficam gravadas no `input.json` porque não deu para verificar offline se
  a API da plataforma resolve transitivamente;
- **um catálogo por run.** Um candidato, usa; nenhum ou mais de um, recusa legível dizendo onde olhou e
  qual argumento resolve. Recusar é a decisão: escolher tema em silêncio responderia com a estética
  errada e o run pareceria correto;
- `{ catalogProject: N }` antes da prosa força o catálogo — é o que permite sondar o catálogo de um tema
  de fora dele. Projeto que não é dependência direta é aceito **com aviso**: a página daqui não poderia
  importar o que foi escolhido;
- o `c1` **fixa no artefato** a referência de nível 2 de cada grupo escolhido (`groupRefs`), e o `c2`
  passou a ler dali em vez de reabrir o nível 1 — reabrir poderia cair noutro catálogo no meio do run.

## 2026-08-19 — nascimento

Primeira versão, junto com o resto da sonda. Decisões que já vieram fechadas do controle do piloto e da
análise-mãe (§11), e que ficam registradas aqui porque nenhum dos dois viaja com o projeto:

- **um nível por prompt.** O passo vê o nível 1 e nada mais. Não é economia: é a hipótese que o piloto
  testa, e o precedente é o prompt de 58 KB que derrubou o `i3-edit`.
- **`none` é resposta.** O nível 1 do piloto publica 6 dos 32 grupos de propósito, para que uma página
  que peça upload ou gráfico volte com `null` em vez de um grupo parecido. O gate aceita `none` e
  recusa grupo não publicado — a mesma regra pelos dois lados.
- **caixa do nome do grupo não custa retry**, mas a da TAG custa (no c2). O que se mede é o catálogo
  carregar a decisão, não o modelo acertar maiúsculas de um nome de pasta; a tag, sim, é a cópia exata
  que a decisão 4 de 19/08 exige.
- **a linha `need` é contrato com o passo seguinte.** O c2 não vê a definição da página — só o nome da
  região e essa linha. O prompt diz o que ela tem de carregar (lista longa, valor livre, comparação por
  atributos, intervalo, hierarquia), porque é isso que separa moléculas irmãs.

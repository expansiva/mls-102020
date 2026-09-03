# CHANGELOG — c1-groups

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

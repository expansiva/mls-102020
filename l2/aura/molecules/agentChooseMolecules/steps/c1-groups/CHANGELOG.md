# CHANGELOG — c1-groups

## 2026-09-04 (d) — o contexto do registro SOMA aos fatos do campo, não os substitui

A cláusula (c) pegou mecanicamente — as quatro linhas passaram a citar o registro — e **deslocou o
conteúdo em vez de somar**. Medido no `cadastro-usuarios-02`:

| campo | antes (6.979) | depois (7.651) |
|---|---|---|
| nome | "Campo de texto para o **nome do usuário**." | "campo de texto do registro da coleção cadastro de usuários" |
| data de nascimento | "Campo de data **de nascimento, somente data**." | "campo de data do registro da coleção cadastro de usuários" |
| ativo | "Campo sim/não para informar **se o usuário está ativo**." | "campo sim/não do registro da coleção cadastro de usuários" |

As quatro linhas ficaram **intercambiáveis a menos da palavra do tipo**, e "de nascimento" — o fato que
decidiria entre digitar e navegar um calendário 30 anos atrás — saiu da linha. Não houve dano no run
porque o `c2` também vê o **nome da região**, e foi de lá que a justificativa dele tirou o "nascimento";
mas a linha `need` é o contrato entre os passos por desenho, e ela foi esvaziada.

**Causa: `Say no more than that`.** A frase existia para proibir layout e foi lida como "a linha é só
isto" — o parágrafo novo virou o gabarito da linha inteira. Consertado em três movimentos:

- **`ALSO`** e **"Added to the field's own facts, never in place of them"**, explícitos;
- **um par certo/errado**, porque a regra abstrata já falhou uma vez aqui: `date of birth, date only, a
  field of a record of the users collection` contra `a date field of a record of the users collection`;
- **o teste do troca-linhas**: *se dois campos do mesmo registro pudessem trocar as linhas `need` e
  nenhuma ficasse errada, as duas estão magras demais*. É verificável pelo próprio modelo e ataca
  exatamente o modo de falha medido;
- a proibição de layout saiu para **parágrafo próprio**, para não voltar a ser lida como escopo da linha.

⚠️ **O que este run também mostrou, e NÃO é conserto de prompt.** As escolhas não mudaram, e a razão é o
inverso do previsto: o `c2` leu *"registro da coleção cadastro de usuários"* como **"formulário de
cadastro"** e usou isso para reforçar os irmãos de formulário (*"decisão explícita de sim/não em um
formulário de cadastro"*). A cláusula não podia entregar densidade — dizer célula/painel/tela é proibido,
porque o `c1` não sabe. E **não há linha de cenário para campo na linha de dados de uma coleção**:
`groupEnterBoolean` tem formulário / acordo legal / listas densas de preferência / configurações, e
`groupEnterDate` tem espaço restrito / campo padrão de formulário / atalhos / calendário sempre visível.
Linha de tabela não é nenhum dos dois. **É vão de catálogo (§12.6), e o `c2` escolheu bem dentro do que
lhe foi oferecido.**

**A cláusula (c) fica EM OBSERVAÇÃO.** Benefício medido até aqui: zero mudança de escolha. O que ela
entrega é uma linha `need` autocontida, que o desenho pede. Se depois deste conserto ela continuar sem
mudar nada, o honesto é removê-la e recuperar os chars.

Instruções: 7.651 → **7.778 chars**.

✅ **Rodou (`cadastro-usuarios-03`) e o deslocamento acabou.** As linhas voltaram na forma aditiva que o
par de exemplos prescreve — `data de nascimento, somente data sem horário, campo de um registro da coleção
cadastro de usuários`; `estado ativo sim/não, valor booleano, campo de um registro da coleção…` — e o teste
do troca-linhas passa: nenhuma das quatro serve para outro campo.

❌ **E as moléculas continuam as mesmas** (`ml-boolean-segmented`, `ml-date-picker`). A cláusula (c) teve
agora uma chance limpa, com o deslocamento consertado, e **mudou zero escolha em dois runs**. A condição de
observação que este CHANGELOG registrou está cumprida.

⚠️ **Mas o argumento de custo que eu usei para a condição estava ERRADO, e medir desfez.** c1: 23.543 →
24.458 tokens de input (+915, +3,9%) para os +799 chars; e o custo da chamada variou US$ 0,0533 / 0,0637 /
0,0559 entre os três runs — **a variação de raciocínio entre runs é maior que a mudança**. "Recuperar os
chars" não é um argumento real; a decisão é de ORDEM DE TRABALHO, não de preço.

**A cláusula é o CANAL, o cenário que falta é o CONTEÚDO.** Não existe linha de cenário para campo
renderizado na linha de dados de uma coleção, então não há o que a linha `need` acione. Removê-la agora
significa recolocá-la depois. **Fica**, e o próximo movimento é editorial: a linha nova no
`groupEnterBoolean` e no `groupEnterDate`, e então rodar o C1 de novo. Se a escolha ainda não se mover, a
cláusula morre com evidência de que o caminho inteiro é sem saída — e não de que um run não a usou.

🔑 **E o conserto editorial é viável sem tocar no gerador:** `syExtract` lê os `scenarios` de volta do
`index.defs.ts` já gerado (*"resync must not clobber them"*) e só os colhe do `index.ts` no primeiro sync.
Edição à mão no `index.defs.ts` **sobrevive** ao resync. Cuidado com o cabeçalho do arquivo, que diz *"Do
not change – automatically generated code"* enquanto o comentário do próprio campo diz *"EDITORIAL … Edit
it HERE"* — as duas frases convivem no mesmo arquivo e só a segunda vale para `scenarios`.

## 2026-09-04 (c) — a linha `need` do campo diz de que registro ele é

O run `cadastro-usuarios` com a cláusula (b) saiu na forma prevista — 5 regiões, 4 grupos, 5/5 moléculas,
0 gate, 0 retry, US$ 0,15 — e **duas das quatro escolhas de campo são suspeitas, pela mesma causa**:

| campo | escolhido | pela linha | o irmão que a linha `need` não deixou competir |
|---|---|---|---|
| `ativo` | `ml-boolean-segmented` | *"…segmented control **in forms**"* | `ml-toggle-icon` — *"compact … for **dense** preference lists"* |
| `data de nascimento` | `ml-date-picker` | *"**Standard form field** with a dropdown calendar"* | `ml-compact-calendar` — *"**Space-constrained** layouts"* |

O `c2` do booleano recebeu *"Campo sim/não para informar se o usuário está ativo."* e nada mais. As
regiões de campo são **irmãs** da região da coleção, então o passo que escolhe o campo não sabe que o
campo vive dentro do contêiner que **outro** `c2` escolheu — e densidade/espaço é justamente o eixo que
separa os irmãos nesses dois grupos. Duas das três escolhas limpas confirmam que o resto está certo: o
`groupEnterText` não tem molécula de e-mail, e *"Simple single‑line text"* é a linha correta para nome e
e-mail.

**É a terceira vez que o defeito é o mesmo: o discriminador existia e não chegou a quem decide.** Então
o conserto é o mesmo de sempre, e continua não pedindo schema: a linha `need` do campo passa a dizer de
que registro ele é — `campo de um registro da coleção <nome da região da coleção>`.

⚠️ **E ela diz só isso, de propósito.** O prompt proíbe escrever *célula*, *painel* ou *tela* na linha:
onde o registro é editado depende da molécula que o `c2` da coleção vai escolher — com detalhe em cena
própria o campo está num formulário, não numa célula —, e no `c1` isso ainda não se sabe. A linha entrega
o **contexto** ("é um registro de uma coleção"), não o layout; quem lê decide o peso que dá.

Instruções: 6.979 → **7.651 chars** — o marcador de versão do prompt no `prompt-c1-groups-01.json`.

## 2026-09-04 (b) — o campo do registro mantido volta a ser região

A emenda da manhã engoliu demais, e o run `crud-cadastro-usuario` mediu isso. Enunciado com os campos
nomeados (*"…Campos do registro: nome (texto), data de nascimento (data), e-mail (texto), ativo
(sim/não)"*) voltou com **uma região só** — a coleção — e os quatro campos como prosa dentro da linha
`need`. Molécula certa (`ml-inline-edit-table`), zero moléculas de campo, e a `ml-inline-edit-table`
declara no próprio objetivo que *"the page owns the VALUES"*: sem molécula de entrada por campo, o que
foi escolhido não monta.

**A frase culpada era o critério positivo**, escrito pensando em ação e não em conteúdo aninhado:
*"something the user fills, picks or reads **that is not content of its neighbour**"*. Um campo dentro de
uma célula **é** conteúdo do vizinho, então o critério o excluía. Somado ao bullet da coleção mantida, a
leitura do modelo ficou consistente: a coleção é a região e tudo dentro dela é descrição dela.

O que estava conflado, e agora está separado no texto:

| | precisa de molécula própria? | é região? |
|---|---|---|
| **capacidade** do contêiner (ordenar, selecionar, salvar) | não | não |
| **conteúdo aninhado** (campo na célula) | **sim** | **sim** |

- o critério positivo passou a ser *"whether a component has to be CHOSEN, **not where it sits on the
  screen**"*, com a frase explícita de que região aninhada continua região;
- seção nova **`### The fields of a record the user MAINTAINS are regions`**: coleção = uma região com os
  verbos no `need`, **mais** uma região por campo nomeado, com o tipo do campo no `need`.

**Os dois limites vieram no mesmo texto, porque cada um é um sobre-disparo previsível na outra direção:**
coluna de coleção que o usuário **só lê** não é região (nada é preenchido ali), e **campo que o enunciado
não nomeia não se inventa** — *"cadastro de usuário"* sozinho continua sendo uma região.

⚠️ **É heurística, e o furo é de ORDEM.** Se um campo precisa de molécula depende da molécula escolhida
para o contêiner — em tabela só de leitura a célula é texto —, e isso só se sabe **depois** do `c2`,
enquanto as regiões nascem no `c1`. O texto contorna pedindo o sinal ao enunciado ("registro que o
usuário cria ou edita"), não à molécula. O conserto estrutural é a região com `parent` + `slot`, que
muda schema, gate e `rows[]`, e não se justifica na sonda: o `agentChooseMolecules2` já tem a estrutura
(`query` → a coleção, cada `input` de `form` → o campo, com o tipo declarado pelo contrato).

**Nota do run que sustenta a escolha:** a linha `need` do `c1` já vinha carregando os tipos dos campos
(*"nome e e-mail em texto, data de nascimento em data e ativo em sim/não"*). A informação estava no
artefato; faltava região para pendurá-la. Os três grupos necessários estão publicados no catálogo
(`groupEnterText`, `groupEnterDate`, `groupEnterBoolean`).

Instruções: 5.731 → **6.979 chars** — é o marcador de versão do prompt no `prompt-c1-groups-01.json`.

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

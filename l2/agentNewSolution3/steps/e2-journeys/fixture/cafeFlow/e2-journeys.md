# CafeFlow - Gestão para Cafeterias e Lanchonetes - Journeys and Features

Module: `cafeFlow`
Language: pt-BR
Version: v1

## Journeys by Actor

### Atendente de caixa (`atendente`)
Registra pedidos no POS, acompanha o status e recebe pagamentos.

#### Lançar pedido no POS (`lancarPedido`)
- Goal: registrar rapidamente um pedido de mesa ou takeout e enviá-lo à cozinha
- So that: o cliente é atendido com agilidade e a cozinha recebe o pedido sem retrabalho
- Trigger: um cliente faz um pedido no balcão
- Steps:
  1. Abrir novo pedido - o atendente inicia um pedido e escolhe se é para mesa ou takeout _(features: Lançamento de pedido no POS)_
  2. Adicionar itens do cardápio - o atendente busca itens no cardápio e adiciona ao pedido com quantidade e observações _(features: Consulta de cardápio no POS, Lançamento de pedido no POS)_
  3. Enviar para a cozinha - o atendente confirma o pedido para que ele entre na fila de preparo _(features: Fila de pedidos da cozinha)_
  4. Acompanhar o status - o atendente vê o pedido avançar de recebido para pronto e chama o cliente _(features: Acompanhamento de status do pedido, Atualização de status pela cozinha)_
  5. Registrar pagamento - o atendente informa a forma de pagamento e o valor recebido para fechar o pedido _(features: Registro manual de pagamento)_
- Outcome: pedido registrado, enviado à cozinha, acompanhado até pronto e pago
- Business rules:
  - Um pedido só pode ser enviado à cozinha com pelo menos um item.
  - O pagamento é registrado manualmente (dinheiro, Pix ou cartão), sem integração com maquininha.
  - Um pedido pago não pode receber novos itens.

#### Consultar cardápio no POS (`consultarCardapio`)
- Goal: encontrar rapidamente um item e ver seus detalhes durante o atendimento
- So that: o atendimento não trava por dúvida sobre preço ou disponibilidade
- Steps:
  1. Abrir o cardápio - o atendente abre a lista de itens disponíveis no POS _(features: Consulta de cardápio no POS)_
  2. Filtrar ou buscar - o atendente filtra por categoria ou busca pelo nome do item _(features: Consulta de cardápio no POS)_
- Outcome: item localizado com preço e disponibilidade para o atendimento
- Business rules:
  - Itens marcados como indisponíveis não podem ser adicionados a um pedido.

### Equipe de cozinha (`cozinha`)
Acompanha a fila de preparo e sinaliza quando cada item fica pronto.

#### Preparar a fila de pedidos (`prepararFila`)
- Goal: produzir os pedidos recebidos e manter o status sincronizado com o salão
- So that: o atendente e o cliente sabem quando o pedido está pronto
- Trigger: um novo pedido entra na fila de preparo
- Steps:
  1. Ver a fila - a cozinha consulta os pedidos pendentes em ordem de chegada _(features: Fila de pedidos da cozinha)_
  2. Iniciar o preparo - a cozinha marca o pedido como em preparo _(features: Atualização de status pela cozinha)_
  3. Marcar como pronto - a cozinha sinaliza que o item está pronto para retirada _(features: Atualização de status pela cozinha)_
- Outcome: pedidos produzidos e status sincronizados entre cozinha e salão
- Business rules:
  - O status de um pedido só avança (recebido → em preparo → pronto), nunca retrocede sem cancelamento explícito.

### Gerente de turno (`gerente`)
Abre e fecha turnos, mantém cardápio e estoque, acompanha o dashboard e usa o assistente IA.

#### Abrir o turno diário (`abrirTurno`)
- Goal: abrir o turno do dia com o saldo inicial de caixa
- So that: as vendas do dia ficam associadas a um turno e o caixa parte de um valor conhecido
- Steps:
  1. Informar abertura - o gerente inicia a abertura do turno do dia _(features: Abertura e fechamento de turno)_
  2. Registrar saldo inicial - o gerente informa o valor inicial do caixa _(features: Abertura e fechamento de turno)_
- Outcome: turno diário aberto e pronto para receber pedidos
- Business rules:
  - Só pode existir um turno aberto por vez.
  - Pedidos só podem ser lançados com um turno aberto.

#### Fechar o turno diário (`fecharTurno`)
- Goal: encerrar o turno com conferência de caixa e obter o relatório de fechamento
- So that: o gerente concilia o caixa e revisa o desempenho do dia
- Steps:
  1. Iniciar fechamento - o gerente inicia o fechamento do turno atual _(features: Abertura e fechamento de turno)_
  2. Informar valores de fechamento - o gerente informa o valor contado em caixa para conferência _(features: Abertura e fechamento de turno)_
  3. Gerar relatório de fechamento - o gerente gera o relatório com vendas e conciliação do turno _(features: Relatório de fechamento de turno)_
- Outcome: turno fechado, caixa conciliado e relatório de fechamento gerado
- Business rules:
  - Um turno com pedidos ainda abertos não pode ser fechado.
  - O relatório de fechamento usa apenas os pedidos e pagamentos do próprio turno.

#### Gerenciar o cardápio (`gerenciarCardapio`)
- Goal: manter itens e categorias do cardápio atualizados e vinculados aos ingredientes
- Steps:
  1. Organizar categorias - o gerente cria, edita ou remove categorias do cardápio _(features: Gestão de itens e categorias do cardápio)_
  2. Manter itens - o gerente cria e edita itens com categoria e preço, e ativa ou desativa a disponibilidade _(features: Gestão de itens e categorias do cardápio)_
  3. Vincular ingredientes - o gerente associa os ingredientes de estoque consumidos por cada item _(features: Vínculo de ingredientes ao item do cardápio)_
- Outcome: cardápio atualizado e itens vinculados aos ingredientes de estoque
- Business rules:
  - Um item sem preço não pode ficar disponível para venda.

#### Controlar o estoque de ingredientes (`gerenciarEstoque`)
- Goal: manter as quantidades de ingredientes atualizadas e reagir a estoque baixo
- Steps:
  1. Cadastrar ingrediente - o gerente cadastra ingredientes e a quantidade atual _(features: Controle simples de estoque)_
  2. Ajustar quantidade - o gerente registra entradas e correções de quantidade _(features: Controle simples de estoque)_
  3. Ver alertas de estoque baixo - o gerente vê quais ingredientes estão abaixo do mínimo para repor _(features: Alertas de estoque baixo)_
- Outcome: estoque de ingredientes atualizado e alertas de baixa visíveis
- Business rules:
  - O controle é apenas por quantidade atual, sem lotes nem validade.
  - A venda de um item baixa automaticamente os ingredientes vinculados.

#### Acompanhar o dashboard do dia (`acompanharDashboard`)
- Goal: acompanhar vendas, itens mais vendidos e estoque baixo em um só lugar
- Steps:
  1. Abrir o dashboard - o gerente abre o painel operacional do dia _(features: Dashboard de vendas do dia)_
  2. Analisar indicadores - o gerente vê vendas do dia, itens mais vendidos e ingredientes em baixa _(features: Dashboard de vendas do dia, Alertas de estoque baixo)_
- Outcome: visão operacional do dia disponível para decisão
- Business rules:
  - O dashboard mostra apenas dados do turno aberto ou do dia corrente.

#### Usar o assistente IA (`usarAssistenteIa`)
- Goal: obter um resumo de vendas do dia e sugestões de itens para promover
- So that: o gerente decide promoções com base nos últimos 7 dias sem montar relatórios à mão
- Steps:
  1. Pedir resumo de vendas - o gerente solicita o resumo de vendas do dia ao assistente _(features: Assistente IA: resumo de vendas do dia)_
  2. Pedir sugestões de promoção - o gerente solicita sugestões de itens para promover com base nos últimos 7 dias _(features: Assistente IA: sugestões de promoção (7 dias))_
- Outcome: gerente recebe resumo e sugestões geradas pela IA da plataforma
- Business rules:
  - As chamadas de IA passam pelo proxy de LLM da plataforma.
  - O assistente usa apenas dados de vendas e estoque do próprio módulo.

## Feature Catalog

### now
- Consulta de cardápio no POS (`menuBrowse`) [atendente]
- Lançamento de pedido no POS (`posEntry`) [atendente]
- Acompanhamento de status do pedido (`orderTracking`) [atendente]
- Registro manual de pagamento (`paymentRecord`) [atendente]
- Fila de pedidos da cozinha (`kitchenQueue`) [cozinha, atendente]
- Atualização de status pela cozinha (`orderStatus`) [cozinha]
- Abertura e fechamento de turno (`shiftControl`) [gerente]
- Relatório de fechamento de turno (`shiftReport`) [gerente]
- Gestão de itens e categorias do cardápio (`menuManagement`) [gerente]
- Controle simples de estoque (`stockControl`) [gerente]
- Dashboard de vendas do dia (`salesDashboard`) [gerente]

### soon
- Vínculo de ingredientes ao item do cardápio (`stockLink`) [gerente]
- Alertas de estoque baixo (`lowStockAlert`) [gerente]
- Assistente IA: resumo de vendas do dia (`aiSalesSummary`) [gerente]

### later
- Assistente IA: sugestões de promoção (7 dias) (`aiPromotionSuggestions`) [gerente]

# Cafe Flow

Module: `cafeFlow`
Language: pt-BR

## Problem
A cafeteria precisa registrar pedidos, acompanhar preparo e avisar quando o pedido estiver pronto para retirada, sem misturar responsabilidades de caixa, cozinha e atendimento.

## Presumed Actors
- Atendente (`atendente`): Registra pedidos no balcao e consulta o andamento.
- Cozinha (`cozinha`): Visualiza pedidos pendentes e marca preparo concluido.

## Scope In
- Registrar pedidos do balcao
- Acompanhar status de preparo
- Avisar pedido pronto para retirada

## Scope Out
- Controle fiscal
- Delivery externo
- Gestao financeira completa

## Open Questions
- [assumed] Quais formas de pagamento devem aparecer no primeiro fluxo? Default: Dinheiro, cartao e pix

## Assumptions
- O catalogo de produtos ja existe ou sera tratado como dado mestre depois.
- O pedido nasce no atendimento e segue para a cozinha.

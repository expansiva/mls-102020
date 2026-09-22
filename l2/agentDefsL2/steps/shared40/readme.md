# shared40

Disponível desde d2_05. O coordenador valida a barreira `contracts30` e abre um worker LLM isolado
por página. O modelo decide somente cenários lógicos, cargas iniciais, refresh pós-command e a
classificação/explicação de confirmação destrutiva. Código deriva nomes, states, actions, bindings,
rotas, referências `.defs.ts`, paths e o item `l2_shared`.

Adaptação do shared antigo: outputs list são arrays (o contrato novo não declara paginação);
identidade derivada de get/update/transition é `selectedEntity`, não editável; demais inputs são
`userInput`. Sessão e rota não são inferidas por nome. Quando essas fontes vierem em contexto
estruturado futuro, devem permanecer ocultas/não editáveis e só contam como resolvidas quando um
valor confiável estiver disponível. Cenários não aceitam layout/sections/layoutRef.

Antes de gravar um result e novamente antes da barreira, o worker relê o snapshot vivo, repete a
estabilidade das fontes e compara o SHA-256 do contrato `.defs.ts` persistido com `contracts.json`.
Setters usam o path completo do campo; o gate recusa colisão de `stateKey` ou `actionId`.

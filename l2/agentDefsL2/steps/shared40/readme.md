# shared40

Disponível desde d2_05. O coordenador valida a barreira `contracts30` e abre um worker LLM isolado
por página. O modelo decide somente cenários lógicos, cargas iniciais, refresh pós-command e a
classificação/explicação de confirmação destrutiva. Código deriva nomes, states, actions, bindings,
rotas, referências `.defs.ts` e paths. O produto exporta somente `definition`, sem pipeline.

Adaptação do shared antigo: outputs list são arrays (o contrato novo não declara paginação);
identidade derivada de get/update/transition é `selectedEntity`, não editável; demais inputs são
`userInput`. Sessão e rota não são inferidas por nome. Quando essas fontes vierem em contexto
estruturado futuro, devem permanecer ocultas/não editáveis e só contam como resolvidas quando um
valor confiável estiver disponível. Cenários não aceitam layout/sections/layoutRef.

Antes de gravar um result e novamente antes da barreira, o worker relê o snapshot vivo, repete a
estabilidade das fontes e compara o SHA-256 do contrato `.defs.ts` persistido com `contracts.json`.
Setters usam o path completo do campo; o gate recusa colisão de `stateKey` ou `actionId`.
Refs semânticas apontam para exports reais do contrato e elementos do próprio shared. A skill
`genD2SharedDefinition.ts` e as fontes declarativas consumidas compõem o contexto; o gate não exige
runtime nem implementação materializada. O parser lê o envelope JSON sem avaliar/importar o defs.

O recibo corrente inclui revisão do formato, símbolos e hashes do contexto/skill. Cobertura técnica
é derivada em memória do contrato e do novo documento, nunca um segundo modelo persistido. Alterar
fontes invalida o reuso da unidade sem regravar bytes idênticos. Alterar o shared inteiro invalida
ambos os devices da mesma página, preservando irmãs sem dependência afetada.

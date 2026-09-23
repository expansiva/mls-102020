# d2_14 — preflight e verificação

Preflight capturado contra 102020 `26ee8ee13a3265c429276871c3381ef3782a6367` e 102047
`ec8525145c2a2eca3c1ebac5bc76268e2ae99280`. O executor não roda `collabmsg`; a supervisão
executa geração/no-op com sala livre e teto de US$ 6.

## Antes da geração

- `preflight.json`: hashes de todo o pool L4, catálogo/skills, schemas, código gerador,
  catálogo molecular e inventário do destino.
- `focused-before.log`: 42 testes passaram; o gate Chrome opt-in foi certificado na d2_13.
- `typecheck-before.json`: l1 0/0, l2 0/0, block false.
- `runner-before.log`: 193 arquivos e as 12 falhas externas nominais.
- `tsc-before.log`: baseline agregado corrente, 292 linhas.
- `legacy-rejection.log`: controle positivo; o verificador rejeita os defs antigos porque ainda
  há cinco parágrafos para quatro organismos em `consultas_recepcionista`.

## Depois da geração viva

Da raiz de `mls-102020`:

```sh
node l2/certificacao/runs/d2_14/verify.mjs inventory-generation.json verification-generation.json
```

O verificador exige 24 defs, 12 page11, 36 descrições de organismo, 18 itens de pipeline,
identidade/paridade desktop-mobile, contentRef/capabilities reais, categoria + skills legíveis,
recomendações moleculares reais e resultado cru/finalize completos. Ele grava dois contextos de
consumer (`consultas_profissional` e `pacientes`) no relatório.

Depois da invocação no-op:

```sh
node l2/certificacao/runs/d2_14/verify.mjs inventory-noop.json verification-noop.json inventory-generation.json
```

Essa segunda forma também exige hashes, bytes e mtimes invariantes. Guardar os task-json e traces
da geração e do no-op nesta pasta; não editar nenhum defs produzido.

# pages50

Per-page desktop/mobile description fan-out. The page-generation agent remains unavailable until its
implementation spec, but its molecule-context boundary is implemented here:

- `moleculeContext.ts` is the pure builder. Level 1 exposes only group id, purpose, variant count and
  index reference; selected groups then expose the literal group catalog and handwritten usage contract.
- `moleculeCatalog.ts` is the production port. It reuses `agentChooseMolecules` discovery and catalog
  readers (active project + direct dependencies, stor before published import) without dispatching that
  agent or writing l4.
- every returned context includes measured UTF-8 bytes and a read ledger. Empty availability has a
  reason; ambiguity, invalid references and missing selected files are explicit errors.

No component variant is selected at this stage. The later materializer receives the selected group's
variant list and usage API, plus normalized `pipeline.skills` references for index and contract.

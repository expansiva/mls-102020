/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c1-bootstrap/gate.ts" enhancement="_blank"/>

// Admission gate for the copy pipeline (pure — unit-testable).
// flow.json c1-bootstrap: NO retry; failures are readable and immediate.
//
// THE RULE OF THIS GATE: it validates the ENTIRE list and returns EVERY issue at once
// (decision 2, fail-fast). "Copiei 10 de 12" in silence is the half-state we refuse. A
// collision is NOT an issue here — c1 records it and c2 resolves it with the user.

import type { CopyChain, CopyContext } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';

export interface CGateIssue {
  code: string;
  message: string;
}

export interface CItemProbe {
  ref: string;
  tsFound: boolean;
  className: string;
  // The chain is read ONCE, here, and travels: the gate judges it and the item is built from
  // it. Reading it twice invites the two reads to disagree.
  chain: CopyChain;
  chainError?: string;
  parentTsFound: boolean;
  parentIsShell: boolean;
  lessFound: boolean;
}

export interface CBootstrapInputs {
  parseErrors: string[];      // malformed references
  expandErrors: string[];     // group references that expanded to nothing
  refsFound: number;          // complete references parsed from the mention
  probes: CItemProbe[];       // one per item, after reading the origin
  context: CopyContext | null;
}

export function runBootstrapGate(inputs: CBootstrapInputs): CGateIssue[] {
  const issues: CGateIssue[] = [];

  for (const error of inputs.parseErrors) issues.push({ code: 'ref_invalid', message: error });
  for (const error of inputs.expandErrors) issues.push({ code: 'group_empty', message: error });

  if (!inputs.refsFound) {
    issues.push({
      code: 'no_ref',
      message: "nenhuma referência de molécula na menção — use '_<projeto>_/l2/molecules/<grupo>[/<ml-molecula>]'",
    });
  }

  for (const probe of inputs.probes) {
    if (!probe.tsFound) {
      issues.push({
        code: 'origin_unreadable',
        message: `${probe.ref}: .ts da origem não é legível — o projeto de origem precisa ser dependência declarada do projeto atual`,
      });
      continue;
    }
    if (!probe.className) {
      issues.push({ code: 'origin_class', message: `${probe.ref}: não foi possível extrair a classe exportada do .ts` });
    }
    if (!probe.lessFound) {
      // NOT blocking (the step filters this code out): a molecule with no appearance of its own is
      // a legitimate state in the base, and aborting a 12-molecule group copy because one item has
      // no sheet is the wrong trade — it was the Studio failure of 2026-08-20 one step earlier.
      issues.push({ code: 'origin_less_missing', message: `${probe.ref}: origem sem .less — a cópia sai sem aparência própria` });
    }
    if (probe.chainError) {
      issues.push({ code: 'chain', message: `${probe.ref}: ${probe.chainError}` });
      continue;
    }
    if (!probe.chain.isShell) continue;

    // Flattening (spec.md): the body comes from the parent, so the parent must be readable
    // and must NOT be a shell itself — depth 1 by contract.
    if (!probe.parentTsFound) {
      issues.push({
        code: 'parent_unreadable',
        message: `${probe.ref}: é uma casca e o .ts do pai não é legível — o projeto do pai precisa ser dependência do projeto atual para achatar a cópia`,
      });
    } else if (probe.parentIsShell) {
      issues.push({
        code: 'chain_depth',
        message: `${probe.ref}: casca de casca não é suportada (profundidade de herança máxima = 1). Aponte para a molécula base ou para a casca de primeiro nível`,
      });
    }
  }

  const ctx = inputs.context;
  if (!ctx) {
    if (!issues.length) issues.push({ code: 'context', message: 'não foi possível montar o contexto da cópia' });
    return issues;
  }

  if (!ctx.items.length) {
    issues.push({ code: 'empty', message: 'nenhuma molécula a copiar depois da expansão das referências' });
  }
  if (!ctx.runKey) issues.push({ code: 'run_key', message: 'runKey ausente no contexto' });
  if (!ctx.destProject) issues.push({ code: 'dest_project', message: 'projeto de destino indisponível (mls.actualProject)' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ctx.copiedFromDate)) {
    issues.push({ code: 'copied_from_date', message: `data de proveniência inválida: '${ctx.copiedFromDate}'` });
  }

  for (const item of ctx.items) {
    if (!/^[a-z0-9]+$/.test(item.destination.group)) {
      issues.push({ code: 'group', message: `${item.origin.ref}: pasta de grupo inválida '${item.destination.group}'` });
    }
    const files = item.destination.files;
    if (!files.ts || !files.defs || !files.less || !files.html) {
      issues.push({ code: 'dest_files', message: `${item.origin.ref}: caminhos de destino incompletos` });
    }
    // Every item must carry its provenance ref: it cannot be reconstituted later (§8.6).
    if (!item.origin.ref) issues.push({ code: 'copied_from', message: 'item sem referência de origem para o copiedFrom' });
    if (item.origin.chain.isShell && !item.origin.chain.parentRef) {
      issues.push({ code: 'parent_ref', message: `${item.origin.ref}: casca sem referência do pai no contexto` });
    }
  }

  // A duplicated destination inside one run would have two items writing the same 4 files.
  const seen = new Set<string>();
  for (const item of ctx.items) {
    const key = item.destination.files.ts;
    if (seen.has(key)) issues.push({ code: 'duplicate', message: `dois itens escreveriam o mesmo arquivo: ${key}` });
    seen.add(key);
  }

  return issues;
}

// Codes the step must NOT treat as blocking (same convention as c3's `defs_missing`).
export const C_BOOTSTRAP_NON_BLOCKING = ['origin_less_missing'];

export function formatIssues(issues: CGateIssue[]): string {
  return issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
}

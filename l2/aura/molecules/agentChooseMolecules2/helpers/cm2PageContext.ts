/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.ts" enhancement="_blank"/>

// The target page's OWN declared intent, formatted for the molecule choice. Pure — the caller passes
// the already-read definition prose (helpers/cm2DefsPatch.parsePageDefsSource's `definitionText`).
//
// ⚠️ v2 (2026-09-08): the SOURCE changed, the purpose did not. v1 read `purpose`,
// `presentation.categoryRef` and the whole `pageObjective` block out of a JSON definition; the page
// defs is prose now (flow.json.decisions.definitionFormat), so what is parsed here are its four
// labelled lines:
//
//   page: Registrar comentário em chamado aberto
//   actor: atendente
//   purpose: Documentar o andamento do atendimento em um chamado aberto.
//   uxExperience: processWizard
//
// WHO NEEDS THIS AND WHO DOES NOT. c1 gets the whole prose as its human prompt — for c1 the prose IS
// the page context, and there is no section to build. c2 never sees the definition (it sees one group's
// catalog and the region lines c1 wrote), so this section is the only way the page's declared intent
// reaches it — and that intent is what the c2 prompt's "the catch-all row is the trap" step needs to
// rule a specific scenario row in or out.
//
// ⚠️ WHY IT STILL EXISTS AT ALL, measured on two runs of the same page in v1 (_102046_
// approveChangeOrder/page21): c1 picked the right GROUP every time and c2 flip-flopped INSIDE it —
// ml-data-table vs ml-view-table (11 siblings), ml-multiline-text vs ml-enter-text (8 siblings) —
// while the one group with just 2 siblings stayed stable. The instability scaled with the number of
// siblings, which is the signature of "nothing to discriminate on". `uxExperience` is what took over
// from presentation.categoryRef as that discriminator: it names the declared experience shape
// (processWizard, entityRecordManagement, dashboardCommandCenter, ...) and it is a DECLARED fact, never
// an inference — the same category as the project language in helpers/cm2ProjectContext.ts.
//
// A prose that declares none of these lines yields no section at all, never a padded guess.

export interface Cm2PageContext {
  page: string;
  actor: string;
  purpose: string;
  uxExperience: string;
}

const LABELS = ['page', 'actor', 'purpose', 'uxExperience'] as const;

export function extractPageContext(definitionText: string): Cm2PageContext {
  const found: Record<string, string> = {};
  for (const line of String(definitionText || '').split('\n')) {
    const match = /^\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*(.+?)\s*$/u.exec(line);
    if (!match) continue;
    const [, label, value] = match;
    // First occurrence wins: the closing paragraph is prose and may well contain a colon.
    if ((LABELS as readonly string[]).includes(label) && !found[label]) found[label] = value;
  }
  return {
    page: found.page || '',
    actor: found.actor || '',
    purpose: found.purpose || '',
    uxExperience: found.uxExperience || '',
  };
}

/** '' when the target declares none of it — the caller then omits the whole prompt section. */
export function formatPageContext(context: Cm2PageContext): string {
  const lines: string[] = [];

  if (context.page) lines.push(`Page: ${context.page}`);
  if (context.actor) lines.push(`Actor who uses it: ${context.actor}`);
  if (context.purpose) lines.push(`Purpose: ${context.purpose}`);

  if (context.uxExperience) {
    lines.push('');
    lines.push(`Experience shape ALREADY DECIDED for this page: **${context.uxExperience}**. A molecule that contradicts it is the wrong molecule, however well it fits the region's own words — and it is what rules a SPECIFIC scenario row in or out, so read it before settling for a broad one.`);
  }

  if (!lines.length) return '';
  return ['## What this page is for (declared in the target file)', '', ...lines].join('\n');
}

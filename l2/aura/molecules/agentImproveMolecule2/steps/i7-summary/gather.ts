/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i7-summary/gather.ts" enhancement="_blank"/>

// Assembling what the run actually did, from the artifacts each step left on disk. PURE.
//
// Everything here is FACT, not narrative: which files changed, which slots were added, what the
// human chose. The LLM's only job downstream is putting it in the user's language — it is never
// asked what happened, because the artifacts already say, and a model asked to recall a pipeline
// invents the parts it did not see.

import { ImArtifactKind, ImCoherenceFinding, ImRoute } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export interface ImRunFacts {
  tag: string;
  groupCanonical: string;
  route: ImRoute | '';
  rationale: string;
  /** The user's own words — what they asked for. */
  request: string;
  /** Artifacts written, in the order the steps touched them. */
  touched: ImArtifactKind[];
  /** One line per edit, from the model's `why`. */
  why: string[];
  playgroundChanged: boolean;
  addedSlots: string[];
  indexUpdated: boolean;
  /** Route C only. */
  inheritWhere: string;
  inheritMember: string;
  findings: ImCoherenceFinding[];
}

export function emptyRunFacts(): ImRunFacts {
  return {
    tag: '', groupCanonical: '', route: '', rationale: '', request: '',
    touched: [], why: [], playgroundChanged: false, addedSlots: [],
    indexUpdated: false, inheritWhere: '', inheritMember: '', findings: [],
  };
}

const ARTIFACT_LABEL: Record<ImArtifactKind, string> = {
  defs: 'the contract (.defs.ts)',
  ts: 'the component (.ts)',
  less: 'the stylesheet (.less)',
  html: 'the playground page (.html)',
  groupIndex: 'the group index page',
};

/**
 * The facts block the prompt embeds.
 *
 * A run that changed nothing says so explicitly rather than rendering an empty list: "no files
 * were changed" is information, and an absent section reads as "not shown to you".
 */
export function renderRunFacts(facts: ImRunFacts): string {
  const lines: string[] = [
    `**Molecule**: \`${facts.tag}\` · group ${facts.groupCanonical}`,
    `**What the user asked**: ${facts.request || '(not recorded)'}`,
    `**Route taken**: ${facts.route || '(unknown)'}${facts.rationale ? ` — ${facts.rationale}` : ''}`,
    '',
    '**Files changed**',
    facts.touched.length
      ? facts.touched.map(kind => `- ${ARTIFACT_LABEL[kind] || kind}`).join('\n')
      : '- none',
  ];

  if (facts.why.length) {
    lines.push('', '**What was done, as the edits themselves recorded it**', ...facts.why.map(w => `- ${w}`));
  }

  if (facts.inheritWhere) {
    lines.push(
      '',
      '**This molecule inherits from another, and the user chose where the fix goes**',
      facts.inheritWhere === 'less'
        ? '- in this molecule\'s own stylesheet, so it keeps inheriting everything else'
        : `- by overriding \`${facts.inheritMember}\` locally, so this molecule no longer inherits that member`,
    );
  }

  lines.push(
    '',
    '**Playground**',
    facts.playgroundChanged
      ? `- updated${facts.addedSlots.length ? `, covering the new slot(s): ${facts.addedSlots.join(', ')}` : ''}`
      : '- not touched: the molecule\'s public surface did not change, so the demo was already correct',
    '',
    '**Group index page**',
    facts.indexUpdated ? '- updated to match the playground' : '- not touched: the playground did not change',
  );

  return lines.join('\n');
}

/**
 * The coherence findings, for the prompt.
 *
 * They are numbered because the summary must carry EVERY one of them, and the number is what makes
 * a dropped finding visible instead of merely absent. `introduced` is stated first: a problem this
 * run caused is not the same news as one it merely noticed.
 */
export function renderFindings(findings: ImCoherenceFinding[]): string {
  if (!findings.length) return '(none — the contract, the code and the group agree)';
  return findings
    .map((f, index) => `${index + 1}. [${f.severity === 'introduced' ? 'CAUSED BY THIS RUN' : 'ALREADY THERE'}] ${f.message}`)
    .join('\n');
}

/**
 * Did the summary carry every finding?
 *
 * The one failure mode worth checking here, and the reason this step has a gate at all: a model
 * asked to write "a short summary" of ten problems writes about three. Silently dropping the
 * findings would defeat the whole point — this agent exists because 13 defects of exactly this
 * shape were found by accident rather than by verification.
 */
export function findingsCarried(reported: string[], findings: ImCoherenceFinding[]): { ok: boolean; missing: number } {
  const carried = reported.filter(line => line.trim()).length;
  return { ok: carried >= findings.length, missing: Math.max(0, findings.length - carried) };
}

/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Resolve.ts" enhancement="_blank"/>

export type Ns4ResolutionClass = 'A' | 'B' | 'C';

export interface Ns4SystemDecision {
  decisionId: string;
  stage: string;
  question: string;
  chosen: string;
  alternatives: string[];
  decidedBy: 'system';
  findingRef: string;
  changeHint: string;
}

interface Ns4ResolutionFindingBase {
  decisionId?: string;
  findingRef: string;
  stage: string;
  question: string;
  alternatives: string[];
  changeHint: string;
}

export interface Ns4TypeAFinding extends Ns4ResolutionFindingBase {
  classification: 'A';
}

export interface Ns4TypeBFinding extends Ns4ResolutionFindingBase {
  classification: 'B';
  /** The behavior already implicit in the generated artifact. */
  defaultChoice: string;
}

export interface Ns4TypeCFinding<TArtifact> extends Ns4ResolutionFindingBase {
  classification: 'C';
  deterministicChoice: string;
  apply: (artifact: TArtifact) => TArtifact;
}

export type Ns4ResolutionFinding<TArtifact> =
  | Ns4TypeAFinding
  | Ns4TypeBFinding
  | Ns4TypeCFinding<TArtifact>;

export interface Ns4ResolutionResult<TArtifact> {
  artifact: TArtifact;
  systemDecisions: Ns4SystemDecision[];
  unresolved: Array<Ns4TypeAFinding>;
}

/**
 * The single NS4 semantic-resolution boundary. Type A remains unresolved,
 * Type B records the generator's existing choice, and Type C applies its
 * caller-supplied mechanical patch before recording the decision.
 */
export function resolveNs4Findings<TArtifact>(
  artifact: TArtifact,
  findings: Array<Ns4ResolutionFinding<TArtifact>>,
): Ns4ResolutionResult<TArtifact> {
  let resolvedArtifact = artifact;
  const systemDecisions: Ns4SystemDecision[] = [];
  const unresolved: Ns4TypeAFinding[] = [];

  findings.forEach(finding => {
    if (finding.classification === 'A') {
      unresolved.push(finding);
      return;
    }
    if (finding.classification === 'C') resolvedArtifact = finding.apply(resolvedArtifact);
    const chosen = finding.classification === 'B' ? finding.defaultChoice : finding.deterministicChoice;
    systemDecisions.push({
      decisionId: finding.decisionId || finding.findingRef,
      stage: finding.stage,
      question: finding.question,
      chosen,
      alternatives: unique([chosen, ...finding.alternatives]),
      decidedBy: 'system',
      findingRef: finding.findingRef,
      changeHint: finding.changeHint,
    });
  });

  return { artifact: resolvedArtifact, systemDecisions, unresolved };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

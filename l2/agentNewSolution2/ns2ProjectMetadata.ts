/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2ProjectMetadata.ts" enhancement="_blank"/>

export function projectIdToRuntimePort(projectId: string | number): number {
  const id = String(projectId).trim();
  const lastThreeDigits = Number(id.slice(-3));
  if (!Number.isInteger(lastThreeDigits) || lastThreeDigits < 0 || lastThreeDigits > 999) {
    throw new Error(`invalid projectId for runtime port: ${id}`);
  }
  return 2000 + lastThreeDigits;
}

export function buildDefaultProjectMetadata(projectIdInput: string | number): Record<string, unknown> {
  const projectId = String(projectIdInput || '').replace(/^mls-/, '');
  if (!/^\d+$/.test(projectId)) return {};
  return {
    projectId,
    domain: `${projectId}.collab.codes`,
    port: projectIdToRuntimePort(projectId),
    databaseName: `collab_${projectId}`,
    environment: 'production',
    studioEnabled: true,
  };
}

/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imCoherence.test.ts" enhancement="_blank"/>

// The cases below are the REAL defects of 2026-08-05/06, reduced. Each test names the molecule it
// came from, so a future change that "simplifies" a gate has to argue with the incident.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoherenceReport,
  gateDeclaredVsUsed,
  gateDefsCoherence,
  readSlotTags,
  readSlotsUsed,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imCoherence.js';

const GROUP_SKILL = `
slotTags = ['Caption', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell', 'Empty', 'Loading', 'Detail'];
`;

test('slotTags and the slots actually read are extracted separately', () => {
  const ts = `
    slotTags = ['Caption', 'Detail'];
    render() { return html\`\${this.renderLiveSlot('Caption')}\`; }
  `;
  assert.deepEqual(readSlotTags(ts), ['Caption', 'Detail']);
  assert.deepEqual(readSlotsUsed(ts), ['Caption']);
});

test('GATE 1: a slot the code declares and the defs never mentions is reported', () => {
  // ml-lazy-record-detail-table, 2026-08-05: the defs omitted `Detail`, and because the playground
  // slot list is generated from the defs, the demo opened with an empty detail area.
  const ts = `slotTags = ['Caption', 'Detail'];`;
  const defs = `Supports only the groupViewTable content areas: Caption.`;
  const findings = gateDefsCoherence(defs, ts, GROUP_SKILL, 'ml-lazy-record-detail-table.ts');
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Detail/);
  assert.match(findings[0].message, /playground/);
});

test('GATE 1: a slot outside the group contract is reported', () => {
  const ts = `slotTags = ['Caption', 'Invented'];`;
  const defs = `Caption and Invented.`;
  const findings = gateDefsCoherence(defs, ts, GROUP_SKILL, 'ml-x.ts');
  assert.ok(findings.some((f) => /not in the group contract/.test(f.message)));
});

test('GATE 1: the self-contradiction is reported as its own finding', () => {
  // The line that hid the other two: the defs claimed conformance while violating it.
  const ts = `slotTags = ['Caption', 'Invented'];`;
  const defs = `Caption and Invented. Does not introduce slots, properties, or events beyond the groupViewTable contract.`;
  const findings = gateDefsCoherence(defs, ts, GROUP_SKILL, 'ml-x.ts');
  assert.ok(findings.some((f) => /the claim is false as written/.test(f.message)));
});

test('GATE 1: a coherent molecule produces no findings', () => {
  const ts = `slotTags = ['Caption', 'Detail'];`;
  const defs = `Supports Caption and Detail, one Detail per body record.`;
  assert.deepEqual(gateDefsCoherence(defs, ts, GROUP_SKILL, 'ml-ok.ts'), []);
});

test('GATE 2: a declared slot that is never read is reported', () => {
  // groupentertext/ml-address-field declares Label, Helper, Prefix and Suffix and reads NONE.
  const ts = `slotTags = ['Label', 'Helper', 'Prefix', 'Suffix'];`;
  const findings = gateDeclaredVsUsed(ts, 'ml-address-field.ts');
  assert.equal(findings.length, 4);
  assert.match(findings[0].message, /silently/);
});

test('GATE 2: a molecule that projects by element gets a softer wording, not a false accusation', () => {
  // renderLiveSlotFrom takes an ELEMENT, so the slot cannot be attributed by name — reporting it
  // as unused would be wrong. The finding asks instead of accusing.
  const ts = `
    slotTags = ['TableCell'];
    render() { return html\`\${this.renderLiveSlotFrom(cell)}\`; }
  `;
  const findings = gateDeclaredVsUsed(ts, 'ml-data-table.ts');
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /projects by element/);
});

test('GATE 2: reading a slot by any of the accessors counts as used', () => {
  const ts = `
    slotTags = ['A', 'B', 'C'];
    render() {
      this.getSlotContent('A');
      this.hasSlot('B');
      this.renderLiveSlot('C');
    }
  `;
  assert.deepEqual(gateDeclaredVsUsed(ts, 'ml-x.ts'), []);
});

test('the report marks as INTRODUCED only what the current run created', () => {
  // Pre-existing debt must not be blamed on this run — it is reported all the same, but the user
  // needs to know which one they just caused.
  const before = `slotTags = ['A'];`;
  const after = `slotTags = ['A', 'B'];`;
  const defs = `A and B.`;
  const report = buildCoherenceReport(
    {
      defsSource: defs,
      tsSource: after,
      groupCreationSkill: `slotTags = ['A', 'B'];`,
      reference: 'ml-x.ts',
      previousTsSource: before,
      previousDefsSource: defs,
    },
    '2026-08-06T00:00:00.000Z',
  );
  const introduced = report.findings.filter((f) => f.severity === 'introduced');
  assert.equal(introduced.length, 1);
  assert.match(introduced[0].message, /'B'/);
});

test('without the previous sources, everything is reported as pre-existing', () => {
  const report = buildCoherenceReport(
    {
      defsSource: 'nothing here',
      tsSource: `slotTags = ['A'];`,
      groupCreationSkill: `slotTags = ['A'];`,
      reference: 'ml-x.ts',
    },
    '2026-08-06T00:00:00.000Z',
  );
  assert.ok(report.findings.length > 0);
  assert.ok(report.findings.every((f) => f.severity === 'preexisting'));
});

/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2MdmModeling.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMdmModelingIssues } from '/_102020_/l2/agentNewSolution2/ns2MdmModeling.js';

test('collectMdmModelingIssues accepts complete mdm-owned entity metadata', () => {
  const issues = collectMdmModelingIssues({
    moduleName: 'cafeFlow',
    entities: {
      Company: {
        title: 'Company',
        description: 'Primary company.',
        ownership: 'mdmOwned',
        kind: 'mdm',
        modelingDecision: 'Company is shared master data and anchors business scope.',
        moduleType: 'cafeFlow.Company',
        mdmSubtype: 'Company',
        requiresAnchor: false,
      },
      Table: {
        title: 'Table',
        description: 'Physical table registration.',
        ownership: 'mdmOwned',
        kind: 'mdm',
        modelingDecision: 'Table has identity, search and relationships, while occupancy is separate core state.',
        moduleType: 'cafeFlow.Table',
        mdmSubtype: 'Location',
        requiresAnchor: true,
        anchor: {
          entityId: 'Company',
          relationshipType: 'Owns',
          description: 'The company owns the table registration.',
        },
      },
    },
    relationships: [{
      relationshipId: 'companyOwnsTable',
      fromEntity: 'Company',
      toEntity: 'Table',
      type: 'Owns',
      description: 'Company owns table registrations.',
      decisionReason: 'Owns expresses possession better than a free-text restaurant/table link.',
    }],
  });

  assert.deepEqual(issues, []);
});

test('collectMdmModelingIssues rejects incomplete mdm-owned entity metadata', () => {
  const issues = collectMdmModelingIssues({
    moduleName: 'cafeFlow',
    entities: {
      Table: {
        title: 'Table',
        description: 'Physical table registration.',
        ownership: 'mdmOwned',
        kind: 'mdm',
        requiresAnchor: true,
      },
    },
    relationships: [],
  });
  const codes = issues.map(issue => issue.code);

  assert.equal(codes.includes('entity.modelingDecision.missing'), true);
  assert.equal(codes.includes('mdm.moduleType.missing'), true);
  assert.equal(codes.includes('mdm.subtype.missing'), true);
  assert.equal(codes.includes('mdm.anchor.missing'), true);
});

test('collectMdmModelingIssues rejects unknown relationship types and missing decision reason', () => {
  const issues = collectMdmModelingIssues({
    moduleName: 'cafeFlow',
    entities: {
      Company: { title: 'Company', description: 'Company.', ownership: 'moduleOwned', kind: 'core', modelingDecision: 'Local operational company state.' },
      Table: { title: 'Table', description: 'Table.', ownership: 'moduleOwned', kind: 'core', modelingDecision: 'Local state.' },
    },
    relationships: [{
      relationshipId: 'companyTable',
      fromEntity: 'Company',
      toEntity: 'Table',
      type: 'RestaurantTable',
      description: 'Free-text relationship.',
    }],
  });
  const codes = issues.map(issue => issue.code);

  assert.equal(codes.includes('relationship.type.invalid'), true);
  assert.equal(codes.includes('relationship.decisionReason.missing'), true);
});

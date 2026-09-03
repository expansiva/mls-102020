# createNewAgentTestSkill - planner agent test guide

Use this guide when creating or changing `.test.ts` files for agents in:

- `/Volumes/WagnerSSD1/collab/mls-base/mls-102020/l2/agentNewSolution/`

The goal is to catch schema, normalizer, and validator drift before a real collab.codes task reaches the agent.

Tests do not call the LLM provider.
They execute pure extraction, schema validation, normalization, and business validation with local fixtures.

## Required Exports

An agent that has structured tool output should expose pure testable pieces:

```ts
export const MY_TOOL_NAME = 'submitSomething';
export const MY_STEP_ID = '12-something';
export const myToolSchema = createPlannerToolSchema(...);

export function extractMyOutput(payload: unknown): MyOutput {
  return extractPlannerOutput(payload, myConfig);
}

export function validateMyOutput(output: MyOutput, ...context: unknown[]): void {
  ...
}
```

If an agent currently keeps extraction/validation private, export only the pure helpers needed by tests.
Do not export runtime hooks just to make tests easier.

## Test File Location

Use the same folder as the agent:

```text
agentNewSolution/<agentName>.test.ts
```

Use this file header:

```ts
/// <mls fileReference="_102020_/l2/agentNewSolution/<agentName>.test.ts" enhancement="_blank"/>
```

## Fixture Types

Each agent should have fixtures for these cases.

### 1. Canonical Valid Payload

This is the exact shape we want the provider to return after tool calling conversion:

```ts
const validPayload = {
  type: 'flexible',
  result: {
    toolName: MY_TOOL_NAME,
    arguments: {
      type: 'flexible',
      result: {
        runId: 'test-run',
        stepId: MY_STEP_ID,
        schemaVersion: '2026-06-02',
        status: 'ok',
        result: {
          // contract-specific fields here
        },
        questions: [],
        trace: ['test fixture'],
      },
    },
  },
};
```

Expected result: extraction and validation pass.

### 2. Real Captured Payload

When a production/task payload exposes a bug, copy the minimal payload into the test.

Name it by behavior, not by date:

```ts
const realPayloadMetricTableRecommendation = { ... };
```

Expected result must be explicit:

- If the payload matches the contract, it must pass.
- If the payload is an LLM error, it must fail with a useful message.

Do not keep ambiguous fixtures.

### 3. Invalid Enum or Const

Use a field that must be closed:

```ts
const invalidTableKindPayload = structuredClone(validPayload);
invalidTableKindPayload.result.arguments.result.result.metricTableDefinition.tableKind = 'metric';
```

Expected result: failure.

The test should catch the exact class of mistake, such as:

- `metric` vs `metricTimeseries`
- `metric` vs `metricTable`
- `module` vs `moduleOwned`
- wrong `stepId`
- wrong `schemaVersion`
- wrong `storageEngine`

### 4. Missing Required Field

Remove one field that the validator reads:

```ts
delete invalidPayload.result.arguments.result.result.metricsPlan.storageEngine;
```

Expected result: failure before downstream business logic depends on the field.

### 5. No Silent Coercion

Use values that JavaScript might coerce incorrectly:

```ts
saveAsDefs: 'true'
enabled: 'false'
createsTask: 1
```

Expected result: failure.

Booleans must be booleans.
Numbers must be numbers.
Enums must be exact strings.

## Business Rule Tests

Schema tests are not enough.
Each agent must also test its domain rules.

Examples:

- `agentRecommendImplementations`: when initial metrics/dashboard was requested, at least one `metricTable` with priority `now` and one admin dashboard page must exist.
- `agentPlanPersistenceIndex`: all generated tables must be `moduleOwned` and `transactional`.
- `agentPlanMetricsIndex`: all metric tables must use `postgresTimescaleDB`.
- `agentPlanMetricTableDefinition`: `tableKind` must be `metricTimeseries`, `layer` must be `layer_1_external`, and direct access must include only `layer_3_usecases`.
- `agentPlanUsecaseEntities`: BFF must call use cases and direct table access from BFF must be forbidden.
- `agentBlueprintReview`: `issues` must be an array and `recommendedFixes` must be string array.

Business validation must use the same enum values as the schema.
If schema accepts `metricTable`, the validator must not require `metric`.

## Envelope Tests

The shared parser must handle transport wrappers but must not repair invalid business content.

For agents using `extractPlannerOutput`, include at least one nested envelope fixture:

```ts
{
  type: 'flexible',
  result: {
    toolName: MY_TOOL_NAME,
    arguments: {
      type: 'flexible',
      result: {
        runId: 'test-run',
        stepId: MY_STEP_ID,
        schemaVersion: '2026-06-02',
        status: 'ok',
        result: { ... },
        questions: [],
        trace: [],
      },
    },
  },
}
```

Also test that a wrong nested `stepId` fails.

## Suggested Test Skeleton

Use the project test runner if one is available.
If not, keep tests as plain TypeScript with small assertion helpers so they can be wired later.

```ts
/// <mls fileReference="_102020_/l2/agentNewSolution/agentExample.test.ts" enhancement="_blank"/>

import {
  EXAMPLE_STEP_ID,
  EXAMPLE_TOOL_NAME,
  extractExampleOutput,
  validateExampleOutput,
} from '/_102020_/l2/agentNewSolution/agentExample.js';

function expectPass(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    throw new Error(`${name} should pass: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expectFail(name: string, fn: () => void, contains: string): void {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(contains)) throw new Error(`${name} failed with unexpected message: ${message}`);
    return;
  }
  throw new Error(`${name} should fail`);
}

const validPayload = {
  type: 'flexible',
  result: {
    toolName: EXAMPLE_TOOL_NAME,
    arguments: {
      type: 'flexible',
      result: {
        runId: 'test-run',
        stepId: EXAMPLE_STEP_ID,
        schemaVersion: '2026-06-02',
        status: 'ok',
        result: {},
        questions: [],
        trace: [],
      },
    },
  },
};

expectPass('valid payload', () => {
  const output = extractExampleOutput(validPayload);
  validateExampleOutput(output);
});

const invalidPayload = structuredClone(validPayload);
// mutate one required field here

expectFail('invalid payload', () => {
  const output = extractExampleOutput(invalidPayload);
  validateExampleOutput(output);
}, 'expected error text');
```

## Completion Checklist

Before considering a new agent done:

- The agent has a `.test.ts` file or an existing test file was updated.
- The test covers a canonical valid payload.
- The test covers at least one captured real payload if one exists.
- The test covers invalid `stepId`.
- The test covers one invalid enum/const.
- The test covers one missing required field.
- The test covers one business rule.
- The test proves booleans are not coerced.
- The test does not call the LLM provider.
- `rtk pnpm build` passes in `/Volumes/WagnerSSD1/collab/mls-base`.

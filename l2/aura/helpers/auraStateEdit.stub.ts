/// <mls fileReference="_102020_/l2/aura/helpers/auraStateEdit.stub.ts" enhancement="_blank" />
// The two browser globals `auraState` reaches for, stubbed BEFORE it is imported.
//
// A separate module because ES imports are hoisted: assignments written above an `import` still run
// after it. Importing this first is the only ordering the language guarantees.
//
// `collabState` touches `window` while it evaluates (it looks for a parent frame that already holds
// the state manager), and `auraState` writes the per-project entry to `localStorage`. Neither exists
// in node, and neither is worth a jsdom.

const store = new Map<string, string>();

(globalThis as unknown as { window: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

/** What the tests read back to assert WHAT was persisted. */
export const localStorageStub = store;

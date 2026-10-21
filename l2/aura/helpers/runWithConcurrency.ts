/// <mls fileReference="_102020_/l2/aura/helpers/runWithConcurrency.ts" enhancement="_blank" />

/**
 * Runs `fn` over `items` with at most `limit` calls in flight, in the items' order. A call that throws
 * does not stop the others: each result is either `{ ok: true, value }` or `{ ok: false, error }`.
 *
 * PURE — no `mls.*`. A batch that is sequential today (`limit = 1`) becomes parallel by changing the limit.
 */
export type ConcurrencyResult<R> = { ok: true; value: R } | { ok: false; error: unknown };

export async function runWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<ConcurrencyResult<R>[]> {
    const results: ConcurrencyResult<R>[] = new Array(items.length);
    const workers = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
    let next = 0;

    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            try {
                results[index] = { ok: true, value: await fn(items[index], index) };
            } catch (error) {
                results[index] = { ok: false, error };
            }
        }
    };

    await Promise.all(Array.from({ length: workers }, worker));
    return results;
}

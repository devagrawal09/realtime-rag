import { createSignal, createMemo } from "solid-js";
import { $PROXY, $TRACK, Accessor, createRoot, untrack } from "solid-js";
import { unwrap } from "solid-js/store";

export function createLazyMemo<T>(
  calc: (prev: T | undefined) => T,
  value?: T
): () => T {
  let isReading = false;
  let isStale: boolean | undefined = true;

  const [track, trigger] = createSignal(void 0, { equals: false });

  const memo = createMemo<T>(
    (p) => (isReading ? calc(p) : ((isStale = !track()), p)),
    value as T,
    { equals: false }
  );

  return (): T => {
    isReading = true;
    if (isStale) isStale = trigger();
    const v = memo();
    isReading = false;
    return v;
  };
}

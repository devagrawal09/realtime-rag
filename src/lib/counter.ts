"use socket";

import { createSignal } from "solid-js";
import { createSocketLazyMemo } from "../../socket/lib/shared";

export const useCounter = () => {
  const [count, setCount] = createSignal<number>(0);

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);

  return { count: createSocketLazyMemo(count), increment, decrement };
};

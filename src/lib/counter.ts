"use socket";

import { createSignal } from "solid-js";
import { createSocketMemo } from "../../socket/lib/shared";

export const useCounter = () => {
  const [count, setCount] = createSignal<number>(0);

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);

  return { count: createSocketMemo(count), increment, decrement };
};

"use socket";

import { createSocketMemo } from "../../socket/lib/shared";
import { createPersistedSignal } from "../../socket/persisted";
import { storage } from "./db";

const [count, setCount] = createPersistedSignal<number>(storage, `count`, 0);

export const useCounter = () => {
  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);

  return { count: createSocketMemo(count), increment, decrement };
};

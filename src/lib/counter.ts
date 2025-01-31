"use socket";

import { createSignal } from "solid-js";
import { createSocketMemo, createSocketRef } from "../../socket/lib/shared";
import { createPersistedSignal } from "../../socket/persisted";
import { Node } from "../../socket/renderer";
import { storage } from "./db";

export const useCounter = () => {
  const [count, setCount] = createSignal<number>(0);

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);

  return {
    count: createSocketMemo(count),
    increment: createSocketRef(increment),
    decrement: createSocketRef(decrement),
    ui: createSocketMemo((): Node => {
      return {
        type: "div",
        children: [
          {
            type: "h1",
            children: ["Counter"],
          },
          {
            type: "button",
            style: {
              "background-color": "yellow",
              padding: "5px 10px",
              border: "1px solid grey",
              "border-radius": "5px",
            },
            children: [`Count ${count()}`],
          },
        ],
      };
    }),
  };
};

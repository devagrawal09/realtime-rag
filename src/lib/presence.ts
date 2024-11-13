"use socket";

import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createSocketMemo } from "../../socket/lib/shared";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

export type PresenceUser = {
  name: string;
  x: number;
  y: number;
  color: string;
};

const [users, setUsers] = createSignal<Record<string, PresenceUser>>({});

export const usePresence = (
  mousePos: () => { x: number; y: number } | undefined
) => {
  const id = crypto.randomUUID();
  const color = Math.floor(Math.random() * 16777215).toString(16);
  const name = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    style: "capital",
    separator: " ",
  });

  createEffect(() => {
    const { x, y } = mousePos() || {};
    x && y && setUsers((u) => ({ ...u, [id]: { name, x, y, color } }));
  });

  onCleanup(() => {
    setUsers(({ [id]: _, ...rest }) => rest);
  });

  const otherUsers = createMemo(() => {
    const { [id]: _, ...rest } = users();
    return rest;
  });

  return createSocketMemo(otherUsers);
};

"use socket";

import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createSocketMemo } from "../../socket/lib/shared";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { useCookies } from "../../socket/lib/server";

export type PresenceUser = {
  name: string;
  x: number;
  y: number;
  color: string;
};

const [presenceDocs, setPresence] = createSignal<
  Record<string, Record<string, PresenceUser>>
>({});

export const usePresence = (
  mousePos: () => { docId?: string; x: number; y: number } | undefined
) => {
  const { userId } = useCookies();
  const color = Math.floor(Math.random() * 16777215).toString(16);
  const name = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    style: "capital",
    separator: " ",
  });

  createEffect(() => {
    const { docId = userId, x, y } = mousePos() || {};
    console.log({
      userId,
      docId,
      x,
      y,
    });
    x &&
      y &&
      setPresence((prev) => ({
        ...prev,
        [docId]: { ...prev[docId], [userId]: { name, x, y, color } },
      }));
  });

  onCleanup(() => {
    const { docId = userId } = mousePos() || {};
    setPresence((prev) => {
      const { [userId]: _, ...rest } = prev[docId];
      return { ...prev, [docId]: rest };
    });
  });

  const otherUsers = createMemo(() => {
    const { [userId]: _, ...rest } =
      presenceDocs()[mousePos()?.docId || userId] || {};
    return rest;
  });

  return createSocketMemo(otherUsers);
};

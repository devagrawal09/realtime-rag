"use socket";

import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createSocketMemo } from "../../socket/lib/shared";
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

  createEffect(() => {
    const { docId = userId, x, y } = mousePos() || {};
    x &&
      y &&
      setPresence((prev) => ({
        ...prev,
        [docId]: { ...prev[docId], [userId]: { name: userId, x, y, color } },
      }));
  });

  onCleanup(() => {
    const { docId = userId } = mousePos() || {};
    setPresence((prev) => {
      const { [userId]: _, ...rest } = prev[docId] || {};
      return { ...prev, [docId]: rest };
    });
  });

  const otherUsers = createMemo(() => {
    const docId = mousePos()?.docId || userId;
    const { [userId]: _, ...rest } = presenceDocs()[docId] || {};
    return rest;
  });

  return createSocketMemo(otherUsers);
};

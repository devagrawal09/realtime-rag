"use socket";

import { createServerEventLog } from "../../socket/events/socket";
import { useCookies } from "../../socket/lib/server";
import { createSocketMemo } from "../../socket/lib/shared";
import { EventLog } from "../../socket/events";
import { createPersistedSignal } from "../../socket/persisted";
import { storage } from "./db";
import { createEffect } from "solid-js";

export type TodoCreated = {
  type: "todo-added";
  id: number;
  title: string;
};
export type TodoToggled = {
  type: "todo-toggled";
  id: number;
};
export type TodoEdited = {
  type: "todo-edited";
  id: number;
  title: string;
};
export type TodoDeleted = {
  type: "todo-deleted";
  id: number;
};
export type TodoEvent = TodoCreated | TodoToggled | TodoEdited | TodoDeleted;

const [todoLogs, setTodoLogs] = createPersistedSignal<
  Record<string, EventLog<TodoEvent>>
>(storage, `todos-logs`, {});

export const useServerTodos = (_listId?: () => string | undefined) => {
  const cookies = useCookies<{ userId?: string }>();

  const listId = () =>
    _listId?.() && invites()[cookies.userId!]?.includes(_listId()!)
      ? _listId()!
      : cookies.userId;

  createEffect(() => {
    console.log(`userId`, cookies.userId, `listId`, listId());
  });

  const { serverEvents, appendEvent } = createServerEventLog(
    listId,
    todoLogs,
    setTodoLogs
  );

  return {
    serverEvents: createSocketMemo(serverEvents),
    appendEvent,
  };
};

const [invites, setInvites] = createPersistedSignal<Record<string, string[]>>(
  storage,
  `invites`,
  {}
);

export const useInvites = () => {
  const cookies = useCookies<{ userId: string }>();

  const addInvite = (invite: string) => {
    setInvites({
      ...invites(),
      [invite]: [...(invites()[invite] || []), cookies.userId],
    });
  };

  const removeInvite = (invite: string) => {
    const newInvites = { ...invites() };
    newInvites[invite] = newInvites[invite].filter((i) => i !== cookies.userId);
    setInvites(newInvites);
  };

  return {
    inviteds: createSocketMemo(() =>
      Object.entries(invites())
        .filter(([, invites]) => invites.includes(cookies.userId))
        .map(([invitee]) => invitee)
    ),
    invites: createSocketMemo(() => invites()[cookies.userId] || []),
    addInvite,
    removeInvite,
  };
};

"use socket";

import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createSocketMemo } from "../../socket/lib/shared";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import {
  createServerLog,
  createServerEventLog,
} from "../../socket/events/socket";
import { useCookies } from "../../socket/lib/server";

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

const [todoLogs, setTodoLogs] = createServerLog<TodoEvent>();

export type TodosFilter = "all" | "active" | "completed" | undefined;

export const useServerTodos = () => {
  const { userId = `123` } = useCookies<{ userId?: string }>();
  const { serverEvents, appendEvent } = createServerEventLog(
    () => userId,
    todoLogs,
    setTodoLogs
  );

  return { serverEvents: createSocketMemo(serverEvents), appendEvent };
};

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

"use socket";

import { createServerEventLog } from "../../socket/events/socket";
import { useCookies } from "../../socket/lib/server";
import { createSocketMemo } from "../../socket/lib/shared";
import { EventLog } from "../../socket/events";
import { createPersistedSignal } from "../../socket/persisted";
import { storage } from "./db";

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

export const useServerTodos = () => {
  const cookies = useCookies<{ userId?: string }>();

  const { serverEvents, appendEvent } = createServerEventLog(
    () => cookies.userId,
    todoLogs,
    setTodoLogs
  );

  return {
    serverEvents: createSocketMemo(serverEvents),
    appendEvent,
  };
};

"use socket";

import {
  createServerLog,
  createServerEventLog,
} from "../../socket/events/socket";
import { useCookies } from "../../socket/lib/server";
import { createSocketMemo } from "../../socket/lib/shared";

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

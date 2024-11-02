"use socket";

import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { Todo } from "~/types";
import { createSocketMemo } from "../../socket/lib/shared";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

const [todos, setTodos] = createSignal<Todo[]>([]);

async function addTodo(title: string) {
  const todo: Todo = {
    id: todos().length + 1,
    title,
    completed: false,
  };
  return setTodos([...todos(), todo]);
}

async function toggleAll(completed: boolean) {
  return setTodos(todos().map((todo) => ({ ...todo, completed })));
}

async function clearCompleted() {
  return setTodos(todos().filter((todo) => !todo.completed));
}

async function toggleTodo(id: number) {
  return setTodos(
    todos().map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  );
}

async function editTodo({ id, title }: { id: number; title: string }) {
  return setTodos(
    todos().map((todo) => (todo.id === id ? { ...todo, title } : todo))
  );
}

const remainingCount = createSocketMemo(
  () => todos().filter((todo) => !todo.completed).length
);

const totalCount = createSocketMemo(() => todos().length);

export type TodosFilter = "all" | "active" | "completed" | undefined;

export const useTodos = (filter: () => TodosFilter) => {
  const filteredTodos = createSocketMemo(() => {
    if (filter() === "active") return todos().filter((todo) => !todo.completed);

    if (filter() === "completed")
      return todos().filter((todo) => todo.completed);

    return todos();
  });

  return {
    todos: filteredTodos,
    totalCount,
    remainingCount,
    addTodo,
    toggleAll,
    clearCompleted,
    toggleTodo,
    editTodo,
  };
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

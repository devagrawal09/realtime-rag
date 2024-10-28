"use socket";

import { createEffect, createSignal } from "solid-js";
import { Todo } from "~/types";
import { createSocketMemo } from "../../socket/lib/shared";

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

createEffect(() => {
  console.log(`todos`, todos());
});

const remainingCount = createSocketMemo(
  () => todos().filter((todo) => !todo.completed).length
);

const totalCount = createSocketMemo(() => todos().length);

export type TodosFilter = "all" | "active" | "completed" | undefined;

export const useTodos = (filter: () => TodosFilter) => {
  createEffect(() => console.log(`filter`, filter()));

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

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

createEffect(() => {
  // console.log(`todos`, todos());
});

export const useTodos = (filter: () => string | undefined) => {
  createEffect(() => console.log(`location`, filter()));

  const filteredTodos = () => {
    const f = filter();
    const t = todos();
    console.log({ f });

    if (f === "active") return t.filter((todo) => !todo.completed);
    else if (f === "completed") return t.filter((todo) => todo.completed);
    else return t;
  };

  return {
    todos: createSocketMemo(() => {
      const f = filteredTodos();
      console.log({ f });
      return f;
    }),
    addTodo,
    toggleAll,
    clearCompleted,
    toggleTodo,
  };
};

"use socket";

import { createEffect, createSignal } from "solid-js";
import { Todo } from "~/types";
import { createSocketMemo } from "../../socket/lib/server";

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

createEffect(() => {
  console.log(`todos`, todos());
});

export const useTodos = () => {
  return {
    todos: createSocketMemo(todos),
    addTodo,
    toggleAll,
    clearCompleted,
  };
};

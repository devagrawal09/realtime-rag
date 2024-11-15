import { createSignal, createMemo, Show, For } from "solid-js";
import { useServerTodos } from "~/lib/todos";
import {
  createClientEventLog,
  createEventProjection,
  createEventComputed,
} from "../../socket/events";
import { createSocketMemo } from "../../socket/lib/shared";
import { CompleteIcon, IncompleteIcon } from "./icons";

export type TodosFilter = "all" | "active" | "completed" | undefined;

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

export function TodoApp(props: { filter: TodosFilter; listId?: string }) {
  const filter = () => props.filter;

  const [editingTodoId, setEditingId] = createSignal();

  const setEditing = ({
    id,
    pending,
  }: {
    id?: number;
    pending?: () => boolean;
  }) => {
    if (!pending || !pending()) setEditingId(id);
  };
  let inputRef!: HTMLInputElement;

  const serverTodos = useServerTodos(createSocketMemo(() => props.listId));
  const { events, appendEvent } = createClientEventLog(serverTodos);
  const todos = createEventProjection(
    events,
    (acc, e) => {
      if (e.type === "todo-added") {
        acc.push({ id: e.id, title: e.title, completed: false });
      }
      if (e.type === "todo-toggled") {
        const todo = acc.find((t) => t.id === e.id);
        if (todo) todo.completed = !todo.completed;
      }
      if (e.type === "todo-deleted") {
        const index = acc.findIndex((note) => note.id === e.id);
        if (index !== -1) acc.splice(index, 1);
      }
      if (e.type === "todo-edited") {
        const todo = acc.find((t) => t.id === e.id);
        if (todo) todo.title = e.title;
      }
      return acc;
    },
    [] as Todo[]
  );

  const filteredTodos = createMemo(() => {
    if (filter() === "active") return todos.filter((t) => !t.completed);
    if (filter() === "completed") return todos.filter((t) => t.completed);
    return todos;
  });

  const remainingTodos = createEventProjection(
    events,
    (acc, e) => {
      if (e.type === "todo-added") {
        acc.push(e.id);
      }
      if (e.type === "todo-toggled") {
        acc.includes(e.id) ? acc.splice(acc.indexOf(e.id), 1) : acc.push(e.id);
      }
      if (e.type === "todo-deleted") {
        acc.includes(e.id) && acc.splice(acc.indexOf(e.id), 1);
      }
      return acc;
    },
    [] as number[]
  );

  const totalCount = createEventComputed(
    events,
    (acc, e) => {
      if (e.type === "todo-added") {
        acc++;
      }
      if (e.type === "todo-deleted") {
        acc--;
      }
      return acc;
    },
    0
  );

  const toggleAll = (completed: boolean) =>
    Promise.all(
      todos
        .filter((t) => t.completed !== completed)
        .map((t) => appendEvent({ type: "todo-toggled", id: t.id }))
    );

  const clearCompleted = () =>
    Promise.all(
      todos
        .filter((t) => t.completed)
        .map((t) => appendEvent({ type: "todo-deleted", id: t.id }))
    );

  return (
    <>
      <header class="header">
        <h1>todos</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!inputRef.value.trim()) e.preventDefault();
            setTimeout(() => (inputRef.value = ""));
            const title = (
              new FormData(e.currentTarget).get("title") as string
            ).trim();
            const id = todos.length + 1;

            if (title.length)
              await appendEvent({ type: "todo-added", title, id });
          }}
        >
          <input
            name="title"
            class="new-todo"
            placeholder="What needs to be done?"
            ref={inputRef}
            autofocus
          />
        </form>
      </header>

      <section class="main">
        <Show when={todos.length > 0}>
          <button
            class={`toggle-all ${remainingTodos.length ? "checked" : ""}`}
            onClick={() => toggleAll(!!remainingTodos.length)}
          >
            ❯
          </button>
        </Show>
        <ul class="todo-list">
          <For each={filteredTodos()}>
            {(todo) => {
              return (
                <li
                  class="todo"
                  classList={{
                    editing: editingTodoId() === todo.id,
                    completed: todo.completed,
                  }}
                >
                  <div>
                    <button
                      class="toggle"
                      onClick={() =>
                        appendEvent({
                          type: "todo-toggled",
                          id: todo.id,
                        })
                      }
                    >
                      {todo.completed ? <CompleteIcon /> : <IncompleteIcon />}
                    </button>

                    <label onDblClick={() => setEditing({ id: todo.id })}>
                      {todo.title}
                    </label>
                    <button
                      class="destroy"
                      onClick={() =>
                        appendEvent({
                          type: "todo-deleted",
                          id: todo.id,
                        })
                      }
                    />
                  </div>
                  <Show when={editingTodoId() === todo.id}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const title = new FormData(e.currentTarget).get(
                          "title"
                        ) as string;
                        appendEvent({
                          type: "todo-edited",
                          id: todo.id,
                          title,
                        });
                        setEditing({});
                      }}
                    >
                      <input
                        name="title"
                        class="edit"
                        value={todo.title}
                        onBlur={(e) => {
                          if (todo.title !== e.currentTarget.value) {
                            e.currentTarget.form!.requestSubmit();
                          } else setEditing({});
                        }}
                      />
                    </form>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>
      </section>

      <footer class="footer">
        <span class="todo-count">
          <strong>{remainingTodos.length}</strong>{" "}
          {remainingTodos.length === 1 ? " item " : " items "} left
        </span>
        <ul class="filters">
          <li>
            <a
              href="?show=all"
              classList={{
                selected: !filter() || filter() === "all",
              }}
            >
              All
            </a>
          </li>
          <li>
            <a
              href="?show=active"
              classList={{ selected: filter() === "active" }}
            >
              Active
            </a>
          </li>
          <li>
            <a
              href="?show=completed"
              classList={{ selected: filter() === "completed" }}
            >
              Completed
            </a>
          </li>
        </ul>
        <Show when={remainingTodos.length !== totalCount()}>
          <button class="clear-completed" onClick={() => clearCompleted()}>
            Clear completed
          </button>
        </Show>
      </footer>
    </>
  );
}

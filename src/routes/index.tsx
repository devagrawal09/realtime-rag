import { type RouteSectionProps } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import { CompleteIcon, IncompleteIcon } from "~/components/icons";
import { type TodosFilter, useTodos } from "~/lib/socket";
import { createSocketMemo } from "../../socket/lib/shared";

export default function TodoApp(props: RouteSectionProps) {
  const filter = createSocketMemo(
    () => props.location.query.show as TodosFilter
  );
  const serverTodos = useTodos(filter);

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

  return (
    <section class="todoapp">
      <header class="header">
        <h1>todos</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!inputRef.value.trim()) e.preventDefault();
            setTimeout(() => (inputRef.value = ""));
            const title = new FormData(e.currentTarget).get("title") as string;
            await serverTodos.addTodo(title);
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
        <Show when={(serverTodos.todos()?.length || 0) > 0}>
          <button
            class={`toggle-all ${
              !serverTodos.remainingCount() ? "checked" : ""
            }`}
            onClick={() =>
              serverTodos.toggleAll(!!serverTodos.remainingCount())
            }
          >
            ❯
          </button>
        </Show>
        <ul class="todo-list">
          <For each={serverTodos.todos()}>
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
                      onClick={() => serverTodos.toggleTodo(todo.id)}
                    >
                      {todo.completed ? <CompleteIcon /> : <IncompleteIcon />}
                    </button>
                    <label onDblClick={() => setEditing({ id: todo.id })}>
                      {todo.title}
                    </label>
                    <button class="destroy" />
                  </div>
                  <Show when={editingTodoId() === todo.id}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const title = new FormData(e.currentTarget).get(
                          "title"
                        ) as string;
                        serverTodos.editTodo({ id: todo.id, title });
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
          <strong>{serverTodos.remainingCount()}</strong>{" "}
          {serverTodos.remainingCount() === 1 ? " item " : " items "} left
        </span>
        <ul class="filters">
          <li>
            <a
              href="?show=all"
              classList={{ selected: !filter() || filter() === "all" }}
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
        <Show when={serverTodos.remainingCount() !== serverTodos.totalCount()}>
          <button
            class="clear-completed"
            onClick={() => serverTodos.clearCompleted()}
          >
            Clear completed
          </button>
        </Show>
      </footer>
    </section>
  );
}

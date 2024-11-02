import { type RouteSectionProps } from "@solidjs/router";
import {
  For,
  Show,
  createComputed,
  createEffect,
  createSignal,
} from "solid-js";
import { CompleteIcon, IncompleteIcon } from "~/components/icons";
import {
  type TodosFilter,
  usePresence,
  useTodos,
  PresenceUser,
} from "~/lib/socket";
import { createSocketMemo } from "../../socket/lib/shared";
import {
  createPositionToElement,
  useMousePosition,
} from "@solid-primitives/mouse";
import { RiDevelopmentCursorLine } from "solid-icons/ri";
import { createStore, reconcile } from "solid-js/store";
import { debounce } from "@solid-primitives/scheduled";
import { Tooltip } from "@kobalte/core/tooltip";

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

  let ref: HTMLElement | undefined;
  const users = usePresence(
    createSocketMemo(createDebouncedMousePos(() => ref))
  );
  const [presenceStore, setPresenceStore] = createStore<PresenceUser[]>([]);

  createComputed(() =>
    setPresenceStore(reconcile(Object.values(users() || {})))
  );

  return (
    <div>
      <div style={{ "text-align": "right", height: "0", padding: "5px 0" }}>
        <For each={presenceStore}>
          {(user) => {
            return (
              <Tooltip>
                <Tooltip.Trigger>
                  <div
                    style={{
                      "background-color": `#${user.color}`,
                      "border-radius": "50%",
                      width: "30px",
                      height: "30px",
                      display: "inline-block",
                      "text-align": "center",
                      "line-height": "30px",
                      color: "white",
                      "font-weight": "bold",
                      "margin-right": "5px",
                      "font-size": "12px",
                    }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    style={{
                      "background-color": `#${user.color}`,
                      color: "white",
                      "border-radius": "5px",
                      padding: "5px",
                    }}
                  >
                    <Tooltip.Arrow />
                    {user.name}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            );
          }}
        </For>
      </div>
      <section class="todoapp" ref={ref}>
        <For each={presenceStore}>
          {(user) => {
            return (
              <div
                class="user"
                style={{
                  position: "absolute",
                  left: `${user.x}px`,
                  top: `${user.y}px`,
                  color: `#${user.color}`,
                  "font-size": "25px",
                }}
              >
                <RiDevelopmentCursorLine />
              </div>
            );
          }}
        </For>
        <header class="header">
          <h1>todos</h1>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!inputRef.value.trim()) e.preventDefault();
              setTimeout(() => (inputRef.value = ""));
              const title = new FormData(e.currentTarget).get(
                "title"
              ) as string;
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
          <Show
            when={serverTodos.remainingCount() !== serverTodos.totalCount()}
          >
            <button
              class="clear-completed"
              onClick={() => serverTodos.clearCompleted()}
            >
              Clear completed
            </button>
          </Show>
        </footer>
      </section>
    </div>
  );
}

function createDebouncedMousePos(ref: () => HTMLElement | undefined) {
  const pos = useMousePosition();
  const relative = createPositionToElement(ref, () => pos);
  const [debouncedPos, setDebouncedPos] = createSignal<{
    x: number;
    y: number;
  }>();
  const trigger = debounce(
    (pos: { x: number; y: number }) => setDebouncedPos(pos),
    5
  );
  createEffect(() => {
    const { x, y } = relative;
    x && y && trigger({ x, y });
  });
  return debouncedPos;
}

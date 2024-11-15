import { Tooltip } from "@kobalte/core/tooltip";
import {
  useMousePosition,
  createPositionToElement,
} from "@solid-primitives/mouse";
import { RouteSectionProps, createAsync, useNavigate } from "@solidjs/router";
import { RiDevelopmentCursorLine } from "solid-icons/ri";
import {
  createSignal,
  createComputed,
  createMemo,
  createEffect,
  For,
  Show,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { CompleteIcon, IncompleteIcon } from "~/components/icons";
import { useInvites } from "~/lib/todos";
import { usePresence, PresenceUser } from "~/lib/presence";
import { useServerTodos } from "~/lib/todos";
import { Todo, TodosFilter } from ".";
import {
  createClientEventLog,
  createEventProjection,
  createEventComputed,
} from "../../socket/events";
import { createSocketMemo } from "../../socket/lib/shared";
import { debounce } from "@solid-primitives/scheduled";
import { getUserId } from "~/lib/auth";

function TodoApp(props: { filter: TodosFilter; listId: string }) {
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

  let ref: HTMLElement | undefined;
  const mousePos = createDebouncedMousePos(() => ref);
  const users = usePresence(
    createSocketMemo(() => ({ docId: props.listId, ...mousePos() }))
  );
  const [presenceStore, setPresenceStore] = createStore<PresenceUser[]>([]);

  createComputed(() =>
    setPresenceStore(reconcile(Object.values(users() || {})))
  );
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

  const serverInvites = useInvites();

  createEffect(() => console.log(`invites`, serverInvites.inviteds));

  return (
    <>
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
      </section>
    </>
  );
}

export default function TodoAppPage(props: RouteSectionProps) {
  return (
    <div>
      <TodoApp
        filter={props.location.query.show as TodosFilter}
        listId={props.params.userId}
      />
    </div>
  );
}

function createDebouncedMousePos(ref: () => HTMLElement | undefined) {
  const pos = useMousePosition();
  const relative = createPositionToElement(ref, () => pos);
  const [debouncedPos, setDebouncedPos] = createSignal<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });
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

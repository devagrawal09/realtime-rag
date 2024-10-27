import { type RouteSectionProps } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";
import { CompleteIcon, IncompleteIcon } from "~/components/icons";
import { useTodos } from "~/lib/socket";
import { Todo } from "~/types";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      setFocus: true;
    }
  }
}

export default function TodoApp(props: RouteSectionProps) {
  const serverTodos = useTodos();
  const location = props.location;

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
  const remainingCount = createMemo(() => {
    const todos = serverTodos.todos() || [];
    return todos.filter((todo) => !todo.completed).length;
  });
  const filterList = (todos: Todo[]) => {
    if (location.query.show === "active")
      return todos.filter((todo) => !todo.completed);
    else if (location.query.show === "completed")
      return todos.filter((todo) => todo.completed);
    else return todos;
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
            const newTodos = await serverTodos.addTodo(title);
            console.log(newTodos);
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
            class={`toggle-all ${!remainingCount() ? "checked" : ""}`}
            onClick={() => serverTodos.toggleAll(!!remainingCount())}
          >
            ❯
          </button>
        </Show>
        <ul class="todo-list">
          <For each={serverTodos.todos()}>
            {(todo) => {
              // const togglingTodo = useSubmission(
              //   toggleTodo,
              //   (input) => input[0] == todo.id
              // );
              // const editingTodo = useSubmission(
              //   editTodo,
              //   (input) => input[0] == todo.id
              // );
              const title = () => todo.title;
              //   editingTodo.pending ? editingTodo.input[0] : todo.title;
              const pending = () => false;
              //   togglingAll.pending ||
              //   togglingTodo.pending ||
              //   editingTodo.pending;
              const completed = () => todo.completed;
              //   togglingAll.pending
              //     ? !togglingAll.input[0]
              //     : togglingTodo.pending
              //     ? !todo.completed
              //     : todo.completed;
              const removing = () => false;
              // removingTodo.some((data) => data.input[0] === todo.id);
              return (
                <Show when={!removing()}>
                  <li
                    class="todo"
                    classList={{
                      editing: editingTodoId() === todo.id,
                      completed: completed(),
                      pending: pending(),
                    }}
                  >
                    <form class="view" method="post">
                      <button
                        // formAction={toggleTodo.with(todo.id)}
                        class="toggle"
                        disabled={pending()}
                      >
                        {completed() ? <CompleteIcon /> : <IncompleteIcon />}
                      </button>
                      <label
                        onDblClick={[setEditing, { id: todo.id, pending }]}
                      >
                        {title()}
                      </label>
                      <button
                        // formAction={removeTodo.with(todo.id)}
                        class="destroy"
                      />
                    </form>
                    <Show when={editingTodoId() === todo.id}>
                      <form
                        // action={editTodo.with(todo.id)}
                        method="post"
                        onSubmit={(e) => {
                          e.preventDefault();
                          setTimeout(() => setEditing({}));
                        }}
                      >
                        <input
                          name="title"
                          class="edit"
                          value={todo.title}
                          onBlur={(e) => {
                            if (todo.title !== e.currentTarget.value) {
                              e.currentTarget.form!.requestSubmit();
                            } else setTimeout(() => setEditing({}));
                          }}
                          use:setFocus
                        />
                      </form>
                    </Show>
                  </li>
                </Show>
              );
            }}
          </For>
          {/* <For each={addingTodo}>
            {(sub) => (
              <li class="todo pending">
                <div class="view">
                  <label>{String(sub.input[0].get("title"))}</label>
                  <button disabled class="destroy" />
                </div>
              </li>
            )}
          </For> */}
        </ul>
      </section>

      <Show when={(serverTodos.todos() || []).length}>
        <footer class="footer">
          <span class="todo-count">
            <strong>{remainingCount()}</strong>{" "}
            {remainingCount() === 1 ? " item " : " items "} left
          </span>
          <ul class="filters">
            <li>
              <a
                href="?show=all"
                classList={{
                  selected:
                    !location.query.show || location.query.show === "all",
                }}
              >
                All
              </a>
            </li>
            <li>
              <a
                href="?show=active"
                classList={{ selected: location.query.show === "active" }}
              >
                Active
              </a>
            </li>
            <li>
              <a
                href="?show=completed"
                classList={{ selected: location.query.show === "completed" }}
              >
                Completed
              </a>
            </li>
          </ul>
          <Show when={remainingCount() !== (serverTodos.todos() || []).length}>
            <button
              class="clear-completed"
              onClick={(e) => serverTodos.clearCompleted()}
            >
              Clear completed
            </button>
          </Show>
        </footer>
      </Show>
    </section>
  );
}

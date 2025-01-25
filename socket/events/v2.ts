import { assert } from "console";
import {
  createEvent,
  createSubject,
  createSubjectStore,
  createTopic,
  Emitter,
  Handler,
} from "solid-events";
import { createMemo, createRenderEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Todo } from "~/components/todos";
import {
  TodoCreated,
  TodoDeleted,
  TodoEdited,
  TodoEvent,
  TodoToggled,
} from "~/lib/todos";

// export const createEventLog = <E>() => {
//   const [onEvent, emitEvent] = createEvent()
//   const log = createSubjectStore<E[]>(
//     () => [],
//     onEvent((e) => (log) => log.push(e))
//   );

//   return { log, onEvent, emitEvent };
// };

type LogEvent<E> = {
  seq: number;
  data: E;
};

export const createLog = <E>(props: { onEvent: Handler<LogEvent<E>> }) => {
  const [_log, setLog] = createStore<{ events: LogEvent<E>[] }>({ events: [] });

  props.onEvent((event) => {});

  const log = createSubjectStore<E[]>(
    () => [],
    props.onEvent((e) => (log) => log.push(e))
  );

  return { log, onEvent: props.onEvent };
};

export const createServerLog = <E>(props: { onEvent: Handler<E> }) => {
  const log = createSubjectStore<E[]>(
    () => [],
    props.onEvent((e) => (log) => log.push(e))
  );

  return { log, onEvent: props.onEvent };
};

// export const createLogProjection = <T extends object>(
//   init: () => T,
//   ...events: Array<Handler<(prev: T) => void>>
// ) => {
//   const actualEvents
//   return createSubjectStore(
//     init,
//     ...events.map((onEvent) =>
//       onEvent((mutation) => {

//         return mutation;
//       })
//     )
//   );
// };

// const [onTodoEvent, emitTodoEvent] = createTopic<E>();

// const [todoId, setTodoId] = createSignal();
// onTodoEvent(
//   () => `todos.${todoId()}`,
//   (todoEvent) => {}
// );

const [counter, setCounter] = createSignal(0);

const [onCounter, emitCounter] = createEvent<number>();

onCounter((count) => {
  if (count) {
    emitCounter(count - 1);
  }
});
onCounter(setCounter);

onCounter(console.log);

// onCounter(setCounter);

emitCounter(1);
flushSync();
// assert(counter() === 10);
// assert(counter() === 0);

const [onTodoEvent, emitTodoEvent] = createEvent<TodoEvent>();

const todos1 = createSubjectStore(
  () => [] as Todo[],
  onTodoEvent((e) => (todos) => {
    if (e.type === "todo-added") {
      const todo = todos.find((t) => t.id === e.id);
      if (!todo) todos.push({ id: e.id, title: e.title, completed: false });
    }
    if (e.type === "todo-toggled") {
      const todo = todos.find((t) => t.id === e.id);
      if (todo) todo.completed = !todo.completed;
    }
    if (e.type === "todo-deleted") {
      const index = todos.findIndex((note) => note.id === e.id);
      if (index !== -1) todos.splice(index, 1);
    }
    if (e.type === "todo-edited") {
      const todo = todos.find((t) => t.id === e.id);
      if (todo) todo.title = e.title;
    }
  })
);

const [onTodoAdded, emitTodoAdded] = createEvent<TodoCreated>();
const [onTodoToggled, emitTodoToggled] = createEvent<TodoToggled>();
const [onTodoDeleted, emitTodoDeleted] = createEvent<TodoDeleted>();
const [onTodoEdited, emitTodoEdited] = createEvent<TodoEdited>();

const todos2 = createSubjectStore(
  () => [] as Todo[],
  onTodoAdded((e) => (todos) => {
    const todo = todos.find((t) => t.id === e.id);
    if (!todo) todos.push({ id: e.id, title: e.title, completed: false });
  }),
  onTodoToggled((e) => (todos) => {
    const todo = todos.find((t) => t.id === e.id);
    if (todo) todo.completed = !todo.completed;
  }),
  onTodoDeleted((e) => (todos) => {
    const index = todos.findIndex((note) => note.id === e.id);
    if (index !== -1) todos.splice(index, 1);
  }),
  onTodoEdited((e) => (todos) => {
    const todo = todos.find((t) => t.id === e.id);
    if (todo) todo.title = e.title;
  })
);

const [onTodoEvents, emitTodoEvents] = createEvent<{
  Added: [Handler<TodoCreated>, Emitter<TodoCreated>];
  Toggled: [Handler<TodoToggled>, Emitter<TodoToggled>];
  Deleted: [Handler<TodoDeleted>, Emitter<TodoDeleted>];
  Edited: [Handler<TodoEdited>, Emitter<TodoEdited>];
}>();

const Added = createEvent<TodoCreated>(),
  Toggled = createEvent<TodoToggled>(),
  Deleted = createEvent<TodoDeleted>(),
  Edited = createEvent<TodoEdited>();

emitTodoEvents({ Added, Toggled, Deleted, Edited });

const todos3 = createSubjectStore(
  () => [] as Todo[],
  onTodoEvents((events) => (todos) => {
    events.Added[0]((e) => {
      const todo = todos.find((t) => t.id === e.id);
      if (!todo) todos.push({ id: e.id, title: e.title, completed: false });
    });
    events.Toggled[0]((e) => {
      const todo = todos.find((t) => t.id === e.id);
      if (todo) todo.completed = !todo.completed;
    });
    events.Deleted[0]((e) => {
      const index = todos.findIndex((note) => note.id === e.id);
      if (index !== -1) todos.splice(index, 1);
    });
    events.Edited[0]((e) => {
      const todo = todos.find((t) => t.id === e.id);
      if (todo) todo.title = e.title;
    });
  })
);

const [onTodoTopic, emitTodoTopic] = createTopic<{
  Added: TodoCreated;
  Toggled: TodoToggled;
  Deleted: TodoDeleted;
  Edited: TodoEdited;
}>();

const todos4 = createSubjectStore(
  () => [] as Todo[],
  onTodoTopic((events) => (todos) => {
    events.Added((e) => {
      const todo = todos.find((t) => t.id === e.id);
      if (!todo) todos.push({ id: e.id, title: e.title, completed: false });
    });
    events.Toggled((e) => {
      const todo = todos.find((t) => t.id === e.id);
      if (todo) todo.completed = !todo.completed;
    });
    events.Deleted((e) => {
      const index = todos.findIndex((note) => note.id === e.id);
      if (index !== -1) todos.splice(index, 1);
    });
    events.Edited((e) => {
      const todo = todos.find((t) => t.id === e.id);
      if (todo) todo.title = e.title;
    });
  })
);

emitTodoTopic({ Added: {} });
emitTodoTopic({ Added: {} });

const todoId = () => 0;

const firstTodo1 = createSubject<Todo | null>(
  null,
  onTodoEvent((e) => (todo) => {
    if (e.type === "todo-added" && e.id === todoId()) {
      return { ...e, completed: false };
    }
    if (todo) {
      if (e.type === "todo-toggled" && e.id === todoId()) {
        return { ...todo, completed: !todo.completed };
      }
      if (e.type === "todo-deleted") {
        if (e.id === todoId()) return null;
      }
      if (e.type === "todo-edited") {
        if (e.id === todoId()) return { ...todo, title: e.title };
      }
    }
    return todo;
  })
);

const firstTodo2 = createMemo(() => {
  const id = todoId();

  return createSubject<Todo | null>(
    null,
    onTodoEvent((e) => (todo) => {
      if (e.type === "todo-added" && e.id === id) {
        return { ...e, completed: false };
      }
      if (todo) {
        if (e.type === "todo-toggled" && e.id === id) {
          return { ...todo, completed: !todo.completed };
        }
        if (e.type === "todo-deleted") {
          if (e.id === id) return null;
        }
        if (e.type === "todo-edited") {
          if (e.id === id) return { ...todo, title: e.title };
        }
      }
      return todo;
    })
  );
});

type TodoTopic = {
  Added: Record<number, TodoCreated>;
  Toggled: Record<number, TodoToggled>;
  Deleted: Record<number, TodoDeleted>;
  Edited: Record<number, TodoEdited>;
};
const [onTodosTopic, emitTodosTopic] = createEvent<TodoTopic>();

const firstTodo3 = createSubject<Todo | null>(
  null,
  onTodosTopic.Added((id: number, e: TodoCreated) => (todo) => {
    if (id === todoId()) return { ...e, completed: false };
    return todo;
  }),
  onTodosTopic.Toggled((id: number, e: TodoToggled) => (todo) => {
    if (id === todoId()) return { ...todo, completed: !todo.completed };
    return todo;
  })
);

const firstTodo5 = createSubject<Todo | null>(
  null,
  onTodosTopic("Added", id, (e: TodoCreated) => (todo) => {
    return { ...e, completed: false };
  }),
  onTodosTopic("Toggled", id, (e: TodoToggled) => (todo) => {
    return { ...todo, completed: !todo.completed };
  })
);

const onToggledTodos = onTodosTopic("Toggled");

const onToggledMyTodo1 = onToggledTodos(id);
const onToggledMyTodo2 = onTodosTopic("Toggled", id);

const onToggledTodoIds1 = onToggledTodos((e: Record<number, TodoToggled>) =>
  Object.keys(e)
);
const onToggledTodoIds2 = onTodosTopic(
  "Toggled",
  (e: Record<number, TodoToggled>) => Object.keys(e)
);

const onToggledMyTodoId1 = onToggledMyTodo1((e) => e.id);
const onToggledMyTodoId2 = onToggledTodos(id, (e) => e.id);
const onToggledMyTodoId3 = onTodosTopic("Toggled", id, (e) => e.id);

emitTodosTopic("Added", 0, {});
emitTodosTopic("Toggled", 3, {});
emitTodosTopic("Added", { 0: {}, 1: {} });
emitTodosTopic({ Added: { 1: {} }, Deleted: { 0: {} } });

const [nextTopic] = createTopic((emit) => {
  onTodoAdded((todoAdded) => {
    emit("Added", todoAdded.id, todoAdded);
  });
});

const [onLocalEvent, emitLocalEvent] = createEvent(onServerEvent);

# Solid Socket

Signals meets WebSockets.

This repo implements the classic TodoMVC app using Solid Socket. Most of the state and logic lives on the server, and the client communicates with it over websockets.

## Getting Started

``` bash
git clone https://github.com/devagrawal09/solid-socket
cd solid-socket
npm install
npm run dev
```

## Base APIs

### `"use socket"`

Use this directive on top of a file to define **socket functions**. A **socket function** is a function exported from a file marked as `"use socket"`. This file will be split into a separate bundle that runs on the server. You can create global state in a `"use socket"` file through signals or any other stateful primitive.

Socket functions work like hooks, and should be called inside Solid.js components. Calling a socket function can instantiate a stateful closure on the server, which is automatically cleaned up with the calling component.

```tsx
// src/lib/socket.tsx
"use socket"

export function useLogger() {
  let i = 0

  function logger() {
    console.log(`Hello World!`, i++)
  }
  
  return logger
}

// src/routes/index.tsx
export default function IndexPage() {
  const serverLogger = useLogger()

  return <button onClick={() => serverLogger()}>Log</button>
}
```

Clicking the button will log the message on the server and increment the count for the next log.

### `createSocketMemo`

A **socket memo** is a signal that can be accessed on the other side of the network. It's a serializable/transportable reactive value. **Socket memos** can be used to share a reactive value from the client to the server, and the server to the client.


```tsx
// src/lib/socket.tsx
"use socket"

export function useCounter() {
  const [count, setCount] = createSignal()
  return {
    count: createSocketMemo(count),
    setCount
  }
}

// src/routes/index.tsx
export default function Counter() {
  const serverCounter = useCounter()

  return <button
    onClick={() => serverCounter.setCount(serverCounter.count() + 1)}
  >
    Count: {serverCounter.count()}
  </button>
}
```

The todos example in this repo shows how to use `createSocketMemo` to also share a signal from the client to the server.

### `createSocketStore`

_Partially implemented_

Truly fine grained reactivity over the wire!
A **socket store** is a nested reactive store accessible on the other side of the network. While `createSocketMemo` sends the entire value across on every update, `createSocketStore` only sends the nested values that are actually being listened to.

```tsx
// src/lib/socket.tsx
"use socket"

export function useConfig() {
  const [config, setConfig] = createStore({ name: 'Sockets', location: 'AWS' })
  return {
    config: createSocketStore(() => config),
    setConfig
  }
}

// src/routes/index.tsx
export default function Page() {
  const serverConfig = useConfig()
  const [configKeys, setConfigKeys] = createSignal(['name'])

  return <For each={configKeys}>
    {key => <span>{key()}: {serverConfig()[key]}</span>}
  </For>
}
```

In this example, the client only renders the `name` property of the config. If the `location` property changes on the server, no updates are sent to the client.

### `createSocketProjection`

_Inspired by the `createProjection` proposal for Solid 2.0_
_Partially implemented_

Similar to `createSocketStore`, but instead of passing in a pre-created store proxy object, you pass in a reactive function that mutates the current state of the proxy using `produce`.

```tsx
// src/lib/socket.tsx
"use socket"

export function useConfig() {
  const [name, setName] = createSignal()
  const [location, setLocation] = createSignal()
  return {
    config: createSocketProjection((draft) => {
      draft.name = name()
      draft.location = location()
    }),
    setConfig
  }
}

// src/routes/index.tsx
export default function Page() {
  const serverConfig = useConfig()
  const [configKeys, setConfigKeys] = createSignal(['name'])

  return <For each={configKeys}>
    {key => <span>{key()}: {serverConfig()[key]}</span>}
  </For>
}
```

## Utilities

### `useCookies`

To access session information like the user id or auth token, you can use `useCookies` inside any `"use socket"` function. Since the cookies are shared between the http and websocket servers, you only need to authenticate the user once on the http side (`"use server"`) and you can reuse the auth cookies without an additional auth layer.

```ts
// src/lib/auth.ts
"use server"

export async function login(username: string, password: string) {
  // authenticate the username and password
  setCookie(`userId`, user.id)
}

// src/lib/todos.ts

export const useTodos = () => {
  const { userId } = useCookies()
  // use userId to access protected data
}
```

### `createPersistedSignal`

Regular signals are ephemeral and only live in the memory of the host. This has two issues in a server environment -
- Servers are not always long lived and persistent, so data stored in memory can be lost
- Horizontally scaled servers don't share state by default, so different users can see different states

To solve these issues, you can use `createPersistedSignal`, which not only stores the data in a persisted database, but also watches for updates so that multiple servers can stay in sync.

```tsx
"use socket"

const storage = createStorage({   // from unstorage
  driver: ...                     // use a driver that supports watching
});

const [count, setCount] = createPersistedSignal<number>(
  storage,  // unstorage client to use
  `count`,  // key for this signal
  0         // initial value
);

```

### Event Log and Sync

Building local first applications requires a realtime sync engine. While you can easily build a sync engine on top of the primitives provided, there's a simple, powerful, and customizable sync engine provided with solid-socket that works on top of an event log.

**Server Event Log**

We start by defining an event log on the server.

```ts
"use socket"

export type TodoCreated = {
  type: "todo-added";
  id: number;
  title: string;
};
export type TodoDeleted = {
  type: "todo-deleted";
  id: number;
};
export type TodoEvent = TodoCreated | TodoDeleted;

const [todoLogs, setTodoLogs] = createServerLog<TodoEvent>();

export const useServerTodos = () => {
  const { userId } = useCookies();
  const { serverEvents, appendEvent } = createServerEventLog(
    () => userId,
    todoLogs,
    setTodoLogs
  );

  return { serverEvents: createSocketMemo(serverEvents), appendEvent };
};
```

`createServerLog` creates a global map of event logs. You can think of it like a database table, where each key is associated with an ordered log of events.

`createServerEventLog` provides access to a single log within the global log using the first argument. In this case, we use the `userId` as the key. It returns a signal to access all the events withing the log, and a method to append an event to the log. We can return both of these to the client.

**Client Event Log**

Next, we create a corresponding event log on the client, with a reference to the server log.

```ts
export default function TodoApp() {

  const serverTodos = useServerTodos();
  const { events, appendEvent } = createClientEventLog(serverTodos);

  ...
```

On the client, we call the `useServerTodos` function to get access to the server log, and `createClientEventLog` to create a corresponding log on the client. The client log also returns a signal to access the events, and a method to append an event to both the client and the server logs. `createClientEventLog` will ensure the client and server stay in sync.

**Reducing Events into State**

Finally, we can use our log of events to construct computations and projections.

```tsx
  ...
  const remainingCount = createEventComputed(
    events,
    (acc, e) => {
      if (e.type === "todo-added") acc++;
      if (e.type === "todo-toggled") acc--;
      if (e.type === "todo-deleted") acc--;
      return acc;
    },
    0
  );

  const todos = createEventProjection(
    events,
    (acc, e) => {
      if (e.type === "todo-added") {
        acc.push({ id: e.id, title: e.title, completed: false });
      }
      if (e.type === "todo-toggled") {
        const todo = acc.find((t) => t.id === e.id);
        if (todo) todo.completed = true;
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

```

`createEventComputed` and `createEventProjection` are primitives that consume the log of events and fold over them to compute immutable and mutable values (respectively). 

**Incremental Updates**

Right now when new events are added, the client receives the entire event log, and the computations rerun from scratch on the entire log.
However, since the log of events is supposed to be an append-only log with no mutations allowed to existing events, this implementation can be incrementalized without any changes to the APIs shown above. The client-server sync can be made smarter so only necesarry updates are sent from the server, and the computations can keep track of events they have already seen so they only fold over new events. This will massively improve the efficiency of the sync engine.

**Conflict Resolution**

The current implementation uses a simple id and version approach to resolving conflicts for simplicity's sake. The length of the event log is considered to be it's "version", and each event is tagged with a unique id on creation.

When an event is appended on the client, it sends that event to the server along with its current version. If the server is at the same version, the append is successful. If the server is ahead of the client, the event is ignored and rolled back on the client.

When an updated log is received from the server, the client simply checks for any events in the update that are not already in the client log, and adds them in. This allows the client to maintain any events added optimistically while the request to append them on the server are still in flight.

These conflict resolution strategies can be customized to the user's needs, and more functional strategies will likely be incorporated into the library and offered out-of-the-box over time.

### `solid-events` Integration

_Work in progress_

Along with communicating in signals, the client and server can also communicate in events using the [`solid-events`](https://github.com/devagrawal09/solid-events) library.

While push-based events require a slightly different mental model to program than signals, they are also cheaper since they don't need to maintain the current state on both sides of the network. Instead, they simply push an event and let the other side process it however they want. Event streams are also naturally serializable, so they don't need a special wrapper like `createSocketEvent` to pass through the network. Events can also useful to communicate domain-specific information that can be used to compute specific state changes on either side, rather than relying on diffing or fine grained store updates.

## Status

This project is highly experimental and you might run into issues building with this. Please report any issues you might find and leave feedback for things you'd like to see!.

### Known Limitations
- If socket functions are not called within components or reactive roots, they will never be cleaned up from the server. Only call socket functions from roots.
- Socket functions can return functions, memos, or objects whose shallow properties are functions or memos. Deeply nested properties that are functions or memos won't be serialized and might throw an error instead.
- The input to a socket function can either be a serializable object or a memo. It cannot be a function or an object with properties that are functions or memos.
- Third party packages that use Solid's signals (such as solid-primitives) might not work yet on the server.

### Roadmap
- More demos
- Integration with `solid-events`
- Address above limitations
- Package as an npm module
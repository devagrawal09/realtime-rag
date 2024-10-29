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

## APIs

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

### `"createSocketMemo"

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

## Status

This project is highly experimental and you might run into issues building with this. Please report any issues you might find and leave feedback for things you'd like to see!.

### Known Limitations
- If socket functions are not called within components or reactive roots, they will never be cleaned up from the server. Only call socket functions from roots.
- Socket functions can return functions, memos, or objects whose shallow properties are functions or memos. Deeply nested properties that are functions or memos won't be serialized and might throw an error instead.
- The input to a socket function can either be a serializable object or a memo. It cannot be a function or an object with properties that are functions or memos.

### Roadmap
- More demos
- `createSocketProjection`
- Integration with `solid-events`
- Address above limitations
- Package as an npm module
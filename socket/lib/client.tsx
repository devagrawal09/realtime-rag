import { from as rxFrom, mergeMap, Observable } from "rxjs";
import {
  createSeriazliedMemo,
  SerializedMemo,
  SerializedProjection,
  SerializedRef,
  SerializedStoreAccessor,
  SerializedThing,
  WsMessage,
  WsMessageDown,
  WsMessageUp,
} from "./shared";
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  from,
  getListener,
  getOwner,
  onCleanup,
  untrack,
} from "solid-js";
import { createAsync } from "@solidjs/router";
import { createLazyMemo } from "@solid-primitives/memo";
import { createCallback } from "@solid-primitives/rootless";

const globalWsPromise = new Promise<SimpleWs>((resolve) => {
  const ws = new WebSocket("ws://localhost:3000/_ws");
  ws.onopen = () => resolve(ws);
});

export type Listener = (ev: { data: any }) => any;
export type SimpleWs = {
  removeEventListener(type: "message", listener: Listener): void;
  addEventListener(type: "message", listener: Listener): void;
  send(data: string): void;
};

function wsRpc<T>(message: WsMessageUp, wsPromise: Promise<SimpleWs>) {
  const id = crypto.randomUUID() as string;

  return new Promise<{ value: T; dispose: () => void }>(async (res, rej) => {
    const ws = await wsPromise;

    function dispose() {
      ws.send(
        JSON.stringify({ type: "dispose", id } satisfies WsMessage<WsMessageUp>)
      );
    }

    function handler(event: { data: string }) {
      // console.log(`handler ${id}`, message, { data: event.data });
      const data = JSON.parse(event.data) as WsMessage<WsMessageDown<T>>;
      if (data.id === id && data.type === "value") {
        res({ value: data.value, dispose });
        ws.removeEventListener("message", handler);
      }
    }

    ws.addEventListener("message", handler);
    ws.send(
      JSON.stringify({ ...message, id } satisfies WsMessage<WsMessageUp>)
    );
  });
}

function wsSub<T>(message: WsMessageUp, wsPromise: Promise<SimpleWs>) {
  const id = crypto.randomUUID();

  return rxFrom(Promise.resolve(wsPromise)).pipe(
    mergeMap((ws) => {
      return new Observable<T>((obs) => {
        // console.log(`attaching sub handler`);
        function handler(event: { data: string }) {
          const data = JSON.parse(event.data) as WsMessage<WsMessageDown<T>>;
          // console.log(`data`, data, id);
          if (data.id === id && data.type === "value") obs.next(data.value);
        }

        ws.addEventListener("message", handler);
        ws.send(
          JSON.stringify({ ...message, id } satisfies WsMessage<WsMessageUp>)
        );

        return () => {
          // console.log(`detaching sub handler`);
          ws.removeEventListener("message", handler);
        };
      });
    })
  );
}

export function createRef<I, O>(
  ref: SerializedRef,
  wsPromise: Promise<SimpleWs>
) {
  return (...input: any[]) =>
    wsRpc<O>(
      {
        type: "invoke",
        ref,
        input,
      },
      wsPromise
    ).then(({ value }) => value);
}

export function createSocketMemoConsumer<O>(
  ref: SerializedMemo,
  wsPromise: Promise<SimpleWs>
) {
  // console.log({ ref });
  const memo = createLazyMemo(
    () =>
      from(
        wsSub<O>(
          {
            type: "subscribe",
            ref,
          },
          wsPromise
        )
      ),
    () => ref.initial
  );

  return () => {
    const memoValue = memo()();
    // console.log({ memoValue });
    return memoValue;
  };
}

export function createSocketProjectionConsumer<O extends object>(
  ref: SerializedProjection<O> | SerializedStoreAccessor<O>,
  wsPromise: Promise<SimpleWs>
) {
  console.log({ ref });

  const nodes = [] as { path: string; accessor: Accessor<any> }[];

  function getNode(path: string) {
    const node = nodes.find((node) => node.path === path);
    if (node) return node;
    const newNode = {
      path,
      accessor: from(wsSub<O>({ type: "subscribe", ref, path }, wsPromise)),
    };
    nodes.push(newNode);
    return newNode;
  }

  return new Proxy<O>(ref.initial!, {
    get(target, path: string) {
      return getListener()
        ? getNode(path).accessor()
        : ((target as any)[path] as O);
    },
  });
}

type SerializedValue = SerializedThing | Record<string, SerializedThing>;

const deserializeValue = (value: SerializedValue) => {
  if (value.__type === "ref") {
    return createRef(value, globalWsPromise);
  } else if (value.__type === "memo") {
    return createSocketMemoConsumer(value, globalWsPromise);
  } else if (value.__type === "projection") {
    return createSocketProjectionConsumer(value, globalWsPromise);
  } else {
    return Object.entries(value).reduce((res, [name, value]) => {
      return {
        ...res,
        [name]:
          value.__type === "ref"
            ? createRef(value, globalWsPromise)
            : value.__type === "memo"
            ? createSocketMemoConsumer(value, globalWsPromise)
            : value.__type === "projection"
            ? createSocketProjectionConsumer(value, globalWsPromise)
            : value.__type === "store-accessor"
            ? createSocketProjectionConsumer(value, globalWsPromise)
            : value,
      };
    }, {} as any);
  }
};

export function createEndpoint(
  name: string,
  input?: any,
  wsPromise = globalWsPromise
) {
  const inputScope = crypto.randomUUID();
  const serializedInput =
    input?.type === "memo"
      ? createSeriazliedMemo({
          name: `input`,
          scope: inputScope,
          initial: untrack(input),
        })
      : input;
  // console.log({ serializedInput });

  const scopePromise = wsRpc<SerializedValue>(
    { type: "create", name, input: serializedInput },
    wsPromise
  );

  if (input?.type === "memo") {
    const [inputSignal, setInput] = createSignal(input());
    createComputed(() => setInput(input()));

    const onSubscribe = createCallback(
      (ws: SimpleWs, data: WsMessage<WsMessageDown<any>>) => {
        createEffect(() => {
          const value = inputSignal();
          // console.log(`sending input update to server`, value, input);
          ws.send(
            JSON.stringify({
              type: "value",
              id: data.id,
              value,
            } satisfies WsMessage<WsMessageUp>)
          );
        });
      }
    );

    const onWs = createCallback((ws: SimpleWs) => {
      function handler(event: { data: string }) {
        const data = JSON.parse(event.data) as WsMessage<WsMessageDown<any>>;

        if (data.type === "subscribe" && data.ref.scope === inputScope) {
          onSubscribe(ws, data);
        }
      }
      ws.addEventListener("message", handler);
      onCleanup(() => ws.removeEventListener("message", handler));
    });

    wsPromise.then(onWs);
  }

  onCleanup(() => {
    // console.log(`cleanup endpoint`);
    scopePromise.then(({ dispose }) => dispose());
  });

  const scope = createAsync(() => scopePromise);
  const deserializedScope = createMemo(
    () => scope() && deserializeValue(scope()!.value)
  );

  return new Proxy((() => {}) as any, {
    get(_, path) {
      const res = deserializedScope()?.[path];
      // console.log(path, res);
      return res || (() => {});
    },
    apply(_, __, args) {
      const res = deserializedScope()?.(...args);
      return res;
    },
  });
}

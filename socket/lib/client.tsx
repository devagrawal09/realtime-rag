import { from as rxFrom, Observable } from "rxjs";
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
  onCleanup,
  untrack,
} from "solid-js";
import { createAsync } from "@solidjs/router";
import { createLazyMemo } from "@solid-primitives/memo";
import { createCallback } from "@solid-primitives/rootless";
import { createWS } from "@solid-primitives/websocket";

const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const wsUrl = `${protocol}://${window.location.hostname}:${window.location.port}/_ws`;
const getWs = createLazyMemo(() => createWS(wsUrl));

export type Listener = (ev: { data: any }) => any;
export type SimpleWs = {
  removeEventListener(type: "message", listener: Listener): void;
  addEventListener(type: "message", listener: Listener): void;
  send(data: string): void;
};

function wsRpc<T>(message: WsMessageUp) {
  const ws = getWs();
  const id = crypto.randomUUID() as string;

  return new Promise<{ value: T; dispose: () => void }>(async (res, rej) => {
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

function wsSub<T>(message: WsMessageUp) {
  const ws = getWs();
  const id = crypto.randomUUID();

  return rxFrom(
    new Observable<T>((obs) => {
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
    })
  );
}

export function createRef<I, O>(ref: SerializedRef) {
  return (...input: any[]) =>
    wsRpc<O>({
      type: "invoke",
      ref,
      input,
    }).then(({ value }) => value);
}

export function createSocketMemoConsumer<O>(ref: SerializedMemo) {
  // console.log({ ref });
  const memo = createLazyMemo(
    () =>
      from(
        wsSub<O>({
          type: "subscribe",
          ref,
        })
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
  ref: SerializedProjection<O> | SerializedStoreAccessor<O>
) {
  console.log({ ref });

  const nodes = [] as { path: string; accessor: Accessor<any> }[];

  function getNode(path: string) {
    const node = nodes.find((node) => node.path === path);
    if (node) return node;
    const newNode = {
      path,
      accessor: from(wsSub<O>({ type: "subscribe", ref, path })),
    };
    nodes.push(newNode);
    return newNode;
  }

  return new Proxy<O>(ref.initial || {}, {
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
    return createRef(value);
  } else if (value.__type === "memo") {
    return createSocketMemoConsumer(value);
  } else if (value.__type === "projection") {
    return createSocketProjectionConsumer(value);
  } else {
    return Object.entries(value).reduce((res, [name, value]) => {
      return {
        ...res,
        [name]:
          value.__type === "ref"
            ? createRef(value)
            : value.__type === "memo"
            ? createSocketMemoConsumer(value)
            : value.__type === "projection"
            ? createSocketProjectionConsumer(value)
            : value.__type === "store-accessor"
            ? createSocketProjectionConsumer(value)
            : value,
      };
    }, {} as any);
  }
};

export function createEndpoint(name: string, input?: any) {
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

  const scopePromise = wsRpc<SerializedValue>({
    type: "create",
    name,
    input: serializedInput,
  });

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

    const ws = getWs();
    function handler(event: { data: string }) {
      const data = JSON.parse(event.data) as WsMessage<WsMessageDown<any>>;

      if (data.type === "subscribe" && data.ref.scope === inputScope) {
        onSubscribe(ws, data);
      }
    }
    ws.addEventListener("message", handler);
    onCleanup(() => ws.removeEventListener("message", handler));
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
      return res || (() => {});
    },
    apply(_, __, args) {
      const res = deserializedScope()?.(...args);
      return res;
    },
  });
}

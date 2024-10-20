import { from as rxFrom, mergeMap, Observable } from "rxjs";
import { SerializedRef, WsMessage, WsMessageDown, WsMessageUp } from "./shared";
import { getListener, onCleanup } from "solid-js";
import { createAsync } from "@solidjs/router";

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
      if (data.id === id) {
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
        function handler(event: { data: string }) {
          const data = JSON.parse(event.data) as WsMessage<WsMessageDown<T>>;
          if (data.id === id) obs.next(data.value);
        }

        ws.addEventListener("message", handler);
        ws.send(
          JSON.stringify({ ...message, id } satisfies WsMessage<WsMessageUp>)
        );

        return () => ws.removeEventListener("message", handler);
      });
    })
  );
}

function refToFn(ref: SerializedRef, wsPromise: Promise<SimpleWs>) {
  return (input) =>
    wsRpc(
      {
        type: "invoke",
        ref,
        input,
      },
      wsPromise
    ).then(({ value }) => value);
}

export function createEndpoint(
  name: string,
  input: any,
  wsPromise = globalWsPromise
) {
  const scopePromise = wsRpc<SerializedRef | Record<string, SerializedRef>>(
    { type: "create", name },
    wsPromise
  );

  onCleanup(() => {
    console.log(`cleanup endpoint`);
    scopePromise.then(({ dispose }) => dispose());
  });

  const scopeValue = scopePromise.then(({ value }) => {
    if (value.__type === "ref") {
      return refToFn(value as SerializedRef, wsPromise);
    } else {
      return Object.entries(value).reduce((res, [name, value]) => {
        return {
          ...res,
          [name]: value.__type === "ref" ? refToFn(value, wsPromise) : value,
        };
      }, {});
    }
  });

  onCleanup(() => {
    scopePromise.then(({ dispose }) => dispose());
  });

  return createAsync(() =>
    scopeValue.then((d) => {
      console.log({ d });
      return d;
    })
  );
}

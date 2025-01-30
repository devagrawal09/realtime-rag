import { createLazyMemo } from "@solid-primitives/memo";
import { createCallback } from "@solid-primitives/rootless";
import { createWS } from "@solid-primitives/websocket";
import { createAsync } from "@solidjs/router";
import { Observable, from as rxFrom } from "rxjs";
import { fromJSON, SerovalJSON, toJSON } from "seroval";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createStore, produce } from "solid-js/store";
import {
  deserializeReactivePayload,
  serializeReactivePayload,
} from "./serializer";
import {
  SerializedMemo,
  SerializedProjection,
  SerializedRef,
  WsMessage,
  WsMessageDown,
  WsMessageUp,
} from "./shared";
import { applyPatches, Patch } from "immer";

const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const wsUrl = `${protocol}://${window.location.hostname}:${window.location.port}/_ws`;
const getWs = createLazyMemo(() => createWS(wsUrl));

export type Listener = (ev: { data: any }) => any;
export type SimpleWs = {
  removeEventListener(type: "message", listener: Listener): void;
  addEventListener(type: "message", listener: Listener): void;
  send(data: string): void;
};

function wsRpc(message: WsMessageUp) {
  const ws = getWs();
  const id = crypto.randomUUID() as string;

  return new Promise<{ value: SerovalJSON; dispose: () => void }>(
    async (res, rej) => {
      function dispose() {
        ws.send(
          JSON.stringify({
            type: "dispose",
            id,
          } satisfies WsMessage<WsMessageUp>)
        );
      }

      function handler(event: { data: string }) {
        // console.log(`handler ${id}`, message, { data: event.data });
        const data = JSON.parse(event.data) as WsMessage<WsMessageDown>;
        if (data.id === id && data.type === "value") {
          res({ value: data.value, dispose });
          ws.removeEventListener("message", handler);
        }
      }

      ws.addEventListener("message", handler);
      ws.send(
        JSON.stringify({ ...message, id } satisfies WsMessage<WsMessageUp>)
      );
    }
  );
}

function wsSub(message: WsMessageUp) {
  const ws = getWs();
  const id = crypto.randomUUID();

  return rxFrom(
    new Observable<SerovalJSON>((obs) => {
      // console.log(`attaching sub handler`);
      function handler(event: { data: string }) {
        const data = JSON.parse(event.data) as WsMessage<WsMessageDown>;
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

function createSocketRefConsumer<I extends any[], O>(ref: SerializedRef) {
  return async (...payload: I) => {
    const input = toJSON(payload);
    const { value } = await wsRpc({ type: "invoke", ref, input });
    return fromJSON<O>(value);
  };
}

function createSocketMemoConsumer<O>(ref: SerializedMemo<O>) {
  const [signal, setSignal] = createSignal(ref.initial);
  const sub = wsSub({ type: "subscribe", ref }).subscribe((value) => {
    setSignal(() => fromJSON<O>(value));
  });
  onCleanup(() => sub.unsubscribe());
  return signal;
}

function createSocketProjectionConsumer<O extends object>(
  ref: SerializedProjection<O>
) {
  const [store, setStore] = createStore(ref.initial);
  const sub = wsSub({ type: "subscribe", ref }).subscribe((patches) => {
    setStore(
      produce((draft) => {
        applyPatches(draft, fromJSON<Patch[]>(patches));
      })
    );
  });
  onCleanup(() => sub.unsubscribe());
  return store as O;
}

export function createEndpoint(name: string, rawInput?: any) {
  const inputScope = crypto.randomUUID();
  const { value: input, refs } = serializeReactivePayload(inputScope, rawInput);
  // console.log({ serializedInput });

  const scopePromise = wsRpc({ type: "create", name, input });

  const onSubscribe = createCallback(
    (ws: SimpleWs, id: string, source: () => any) => {
      createEffect(() => {
        ws.send(JSON.stringify({ type: "value", id, value: source() }));
      });
    }
  );

  const ws = getWs();
  function handler(event: { data: string }) {
    const data = JSON.parse(event.data) as WsMessage<WsMessageDown>;
    if (data.type === "subscribe" && data.ref.scope === inputScope) {
      const source = refs.get(data.ref.id);
      if (source) {
        onSubscribe(ws, data.ref.id, () => source());
      }
    }
  }
  ws.addEventListener("message", handler);

  onCleanup(() => {
    // console.log(`cleanup endpoint`);
    ws.removeEventListener("message", handler);
    scopePromise.then(({ dispose }) => dispose());
  });

  const scope = createAsync(() => scopePromise);
  const deserializedScope = createMemo(
    () =>
      scope() &&
      deserializeReactivePayload(scope()!.value, {
        createSocketMemoConsumer,
        createSocketRefConsumer,
        createSocketProjectionConsumer,
      })
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

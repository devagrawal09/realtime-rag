import {
  type Accessor,
  onCleanup,
  createSignal,
  // @ts-expect-error
} from "solid-js/dist/solid";

export function from<T>(producer: {
  subscribe: (fn: (v: T) => void) => { unsubscribe: () => void };
}): Accessor<T | undefined> {
  const [s, set] = createSignal<T | undefined>(undefined);
  const sub = producer.subscribe(set);
  onCleanup(() => sub.unsubscribe());
  return s;
}

export type WsMessage<T> = T & { id: string };

export type WsMessageUp<I = any> =
  | {
      type: "create";
      name: string;
      input?: I;
    }
  | {
      type: "subscribe";
      ref: SerializedMemo;
    }
  | {
      type: "dispose";
    }
  | {
      type: "invoke";
      ref: SerializedRef;
      input?: I;
    };

export type WsMessageDown<T> =
  | {
      value: T;
    }
  | {
      type: "subscribe";
      ref: SerializedMemo;
    };

export type SerializedRef<I = any, O = any> = {
  __type: "ref";
  name: string;
  scope: string;
};

export type SerializedMemo<O = any> = {
  __type: "memo";
  name: string;
  scope: string;
  initial: O;
};

export type SerializedThing = SerializedRef | SerializedMemo;

export type SerializedStream<O = any> = {
  __type: "stream";
  name: string;
  scope: string;
  value: O;
};

export function createSeriazliedMemo(
  opts: Omit<SerializedMemo, "__type">
): SerializedMemo {
  return { ...opts, __type: "memo" };
}

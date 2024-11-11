import { createComputed, $PROXY } from "solid-js";
import { createStore, produce } from "solid-js/store";

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
      path?: undefined;
    }
  | {
      type: "subscribe";
      ref: SerializedProjection | SerializedStoreAccessor;
      path: string;
    }
  | {
      type: "dispose";
    }
  | {
      type: "invoke";
      ref: SerializedRef;
      input?: I;
    }
  | {
      type: "value";
      value: I;
    };

export type WsMessageDown<T> =
  | {
      type: "value";
      value: T;
    }
  | {
      type: "subscribe";
      ref: SerializedMemo;
    }
  | {
      type: "subscribe";
      ref: SerializedProjection;
      path: string;
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
  initial?: O;
};

export type SerializedProjection<O = any> = {
  __type: "projection";
  name: string;
  scope: string;
  initial?: O;
};

export type SerializedStoreAccessor<O = any> = {
  __type: "store-accessor";
  name: string;
  scope: string;
  initial?: O;
};

export type SerializedReactiveThing<T = any> =
  | SerializedMemo<T>
  | SerializedProjection<T>
  | SerializedStoreAccessor<T>;

export type SerializedThing<T = any> =
  | SerializedRef<T>
  | SerializedReactiveThing<T>;

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

export function createSeriazliedProjection(
  opts: Omit<SerializedProjection, "__type">
): SerializedProjection {
  return { ...opts, __type: "projection" };
}

export function createSeriazliedStore(
  opts: Omit<SerializedStoreAccessor, "__type">
): SerializedStoreAccessor {
  return { ...opts, __type: "store-accessor" };
}

export function createSocketMemo<T>(source: () => T): () => T | undefined {
  // @ts-expect-error
  source.type = "memo";
  return source;
}

export function createSocketProjection<T extends object = {}>(
  storeOrMutation: (draft: T) => void,
  init?: T
): T | undefined {
  // @ts-expect-error
  const [store, setStore] = createStore<T>(init || {});
  createComputed(() => setStore(produce(storeOrMutation)));
  // @ts-expect-error
  store.type = "projection";
  return store;
}

export function createSocketStore<T extends object = {}>(
  storeAccessor: () => T
): T | undefined {
  // @ts-expect-error
  storeAccessor.type = "store-accessor";
  return storeAccessor as any;
}

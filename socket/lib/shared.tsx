import { SerovalJSON } from "seroval";
import { $TRACK, $PROXY } from "solid-js";
import { enablePatches } from "immer";
enablePatches();

export type WsMessage<T> = T & { id: string };

export type WsMessageUp =
  // | {
  //     type: "subscribe";
  //     ref: SerializedReactiveThing;
  //   }
  | {
      type: "invoke";
      ref: SerializedRef;
      input: SerovalJSON;
    }
  | {
      type: "value";
      value: SerovalJSON;
    }
  | {
      type: "create";
      name: string;
      input: SerovalJSON;
    }
  | {
      type: "dispose";
    };

export type WsMessageDown =
  // | {
  //     type: "subscribe";
  //     ref: SerializedReactiveThing;
  //   }
  | {
      type: "invoke";
      ref: SerializedRef;
      input: SerovalJSON;
    }
  | {
      type: "value";
      value: SerovalJSON;
    };

export type SerializedRef<I = any, O = any> = {
  __type: "ref";
  id: string;
  scope: string;
};

export type SerializedMemo<O = any> = {
  __type: "memo";
  id: string;
  scope: string;
  initial?: O;
};

export type SerializedProjection<O = any> = {
  __type: "projection";
  id: string;
  scope: string;
  initial?: O;
};

export type SerializedReactiveThing<T = any> =
  | SerializedMemo<T>
  | SerializedProjection<T>;

export type SerializedThing = SerializedRef | SerializedReactiveThing;

export type SerializedStream = {
  __type: "stream";
  id: string;
  scope: string;
};

export function createSeriazliedRef(
  opts: Omit<SerializedRef, "__type">
): SerializedRef {
  return { ...opts, __type: "ref" };
}

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

export function createSocketLazyMemo<T>(source: () => T): () => T | undefined {
  // @ts-expect-error
  source.type = "memo";
  return source;
}

export function createSocketLazyProjection<T extends object>(
  mutation: (draft: T) => void,
  init?: T
): T | undefined {
  let state = init;
  // @ts-expect-error
  state[$TRACK] = mutation;
  return state;
}

export function createSocketMemo<T>(source: () => T): () => T | undefined {
  // @ts-expect-error
  source.type = "eager-memo";
  return source;
}

export function createSocketProjection<T extends object>(
  mutation: (draft: T) => void,
  init?: T
): T | undefined {
  let state = init;
  // @ts-expect-error
  state[$PROXY] = mutation;
  return state;
}

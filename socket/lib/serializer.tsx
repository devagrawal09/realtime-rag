import { enablePatches, produce as immerProduce, Patch } from "immer";
import { createPlugin, fromJSON, SerovalJSON, toJSON } from "seroval";
import { Accessor, createMemo } from "solid-js";
import {
  createSeriazliedMemo,
  createSeriazliedProjection,
  createSeriazliedRef,
  SerializedMemo,
  SerializedMemoClass,
  SerializedProjection,
  SerializedProjectionClass,
  SerializedRef,
  SerializedRefClass,
} from "./shared";
enablePatches();

export function serializeReactivePayload(scope: string, input: any) {
  const refs = new Map<string, Function>();
  const signals = new Map<string, Function>();

  const value = toJSON(input, {
    plugins: [
      createPlugin<SerializedRefClass, SerializedRef>({
        tag: "seroval-plugins/socket/ref",
        test: (value) => value instanceof SerializedRefClass,
        parse: {
          sync(value) {
            const id = crypto.randomUUID();
            refs.set(id, value.handler);
            return createSeriazliedRef({ scope, id });
          },
        },
        serialize: () => ``,
        deserialize: () => ({} as any),
      }),
      createPlugin<SerializedMemoClass, SerializedMemo>({
        tag: "seroval-plugins/socket/memo",
        test: (value: any) => value instanceof SerializedMemoClass,
        parse: {
          sync(value) {
            const id = crypto.randomUUID();
            signals.set(id, value.signal);
            return createSeriazliedMemo({ scope, id });
          },
        },
        serialize: () => ``,
        deserialize: () => ({} as any),
      }),
      createPlugin<SerializedProjectionClass, SerializedProjection>({
        tag: "seroval-plugins/socket/projection",
        test: (value: any) => value instanceof SerializedProjectionClass,
        parse: {
          sync(store) {
            const id = crypto.randomUUID();

            const projection = createMemo(
              ({ state, changes: _c }) => {
                let changes = [] as Patch[];
                const s = immerProduce(
                  state,
                  store.mutation as any,
                  (patches) => {
                    changes.push(...patches);
                  }
                );
                return { state: s, changes };
              },
              { state: store.init, changes: [] as Patch[] }
            );

            signals.set(id, () => projection().changes);
            return createSeriazliedProjection({
              scope,
              id,
              initial: store.init,
            });
          },
        },
        serialize: () => ``,
        deserialize: () => ({} as any),
      }),
    ],
  });

  return { value, refs, signals };
}

export function deserializeReactivePayload(
  value: SerovalJSON,
  plugins: {
    createSocketRefConsumer<I extends any[], O>(
      ref: SerializedRef
    ): (...payload: I) => Promise<O>;
    createSocketMemoConsumer<O>(
      ref: SerializedMemo<O>
    ): Accessor<O | undefined>;
    createSocketProjectionConsumer<O extends object>(
      ref: SerializedProjection<O>
    ): O;
  }
) {
  console.log({ value });
  return fromJSON<any>(value, {
    plugins: [
      createPlugin<Function, SerializedRef>({
        tag: "seroval-plugins/socket/ref",
        test: () => true,
        parse: {},
        serialize: () => ``,
        deserialize: plugins.createSocketRefConsumer,
      }),
      createPlugin<Function, SerializedMemo>({
        tag: "seroval-plugins/socket/memo",
        test: () => true,
        parse: {},
        serialize: () => ``,
        deserialize: plugins.createSocketMemoConsumer,
      }),
      createPlugin<object, SerializedProjection>({
        tag: "seroval-plugins/socket/projection",
        test: () => true,
        parse: {},
        serialize: () => ``,
        deserialize: plugins.createSocketProjectionConsumer,
      }),
    ],
  });
}

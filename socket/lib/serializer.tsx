import { createPlugin, fromJSON, SerovalJSON, toJSON } from "seroval";
import { $TRACK, Accessor, createMemo } from "solid-js";
import {
  createSeriazliedMemo,
  createSeriazliedProjection,
  createSeriazliedRef,
  SerializedMemo,
  SerializedProjection,
  SerializedRef,
} from "./shared";
import {
  produce as immerProduce,
  applyPatches,
  enablePatches,
  Patch,
} from "immer";
enablePatches();

export function serializeReactivePayload(scope: string, input: any) {
  const refs = new Map<string, Function>();

  const value = toJSON(input, {
    plugins: [
      createPlugin<Function, SerializedRef>({
        tag: "seroval-plugins/socket/ref",
        test: (value) => typeof value === "function",
        parse: {
          sync(value) {
            const id = crypto.randomUUID();
            refs.set(id, value);
            return createSeriazliedRef({ scope, id });
          },
        },
        serialize: () => ``,
        deserialize: () => ({} as any),
      }),
      createPlugin<Function, SerializedMemo>({
        tag: "seroval-plugins/socket/memo",
        test: (value: any) =>
          typeof value === "function" && value.type === "memo",
        parse: {
          sync(value) {
            const id = crypto.randomUUID();
            refs.set(id, value);
            return createSeriazliedMemo({ scope, id });
          },
        },
        serialize: () => ``,
        deserialize: () => ({} as any),
      }),
      createPlugin<any, SerializedProjection>({
        tag: "seroval-plugins/socket/projection",
        test: (value: any) => $TRACK in value,
        parse: {
          sync(state) {
            const id = crypto.randomUUID();

            const mutation = state[$TRACK];

            const projection = createMemo(
              ({ state, changes: _c }) => {
                let changes = [] as Patch[];
                const s = immerProduce(state, mutation, (patches) => {
                  changes.push(...patches);
                });
                return { state: s, changes };
              },
              { state, changes: [] as Patch[] }
            );

            refs.set(id, () => projection().changes);
            return createSeriazliedProjection({ scope, id, initial: state });
          },
        },
        serialize: () => ``,
        deserialize: () => ({} as any),
      }),
    ],
  });

  return { value, refs };
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

import { createSignal, createEffect, onCleanup, Accessor } from "solid-js";
import type { Storage, StorageValue } from "unstorage";

export function createPersistedSignal<T extends StorageValue>(
  storage: Storage,
  key: string
): readonly [Accessor<T | undefined>, (v: T) => Promise<void>];
export function createPersistedSignal<T extends StorageValue>(
  storage: Storage,
  key: string,
  init: T
): readonly [Accessor<T>, (v: T) => Promise<void>];
export function createPersistedSignal<T extends StorageValue>(
  storage: Storage,
  key: string,
  init?: T
) {
  const [value, _setValue] = createSignal<T | undefined>(init);

  createEffect(() => {
    storage.getItem<T>(key).then((v) => v && _setValue(() => v));
    const unwatchPromise = storage.watch(async (e, k) => {
      if (k === key) {
        if (e === "update") {
          const v = await storage.getItem<T>(key);
          v && value() !== v && _setValue(() => v);
        }
        if (e === "remove") {
          _setValue(() => init);
        }
      }
    });

    onCleanup(() => unwatchPromise.then((unwatch) => unwatch()));
  });

  const setValue = async (v: T) => {
    if (v === value()) return;
    _setValue(() => v);
    await storage.setItem(key, v);
  };

  return [value, setValue] as const;
}

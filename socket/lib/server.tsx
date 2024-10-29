import {
  createSeriazliedMemo,
  SerializedMemo,
  SerializedRef,
  SerializedStream,
  SerializedThing,
  WsMessage,
  WsMessageDown,
  WsMessageUp,
} from "./shared";
import {
  createMemo,
  createRoot,
  createSignal,
  from,
  observable,
  onCleanup,
  untrack,
} from "solid-js";
import { getManifest } from "vinxi/manifest";
import { Observable } from "rxjs";

export type Callable<T> = (arg: unknown) => T | Promise<T>;

export type Endpoint<I> = (
  input: I
) => Callable<any> | Record<string, Callable<any>>;
export type Endpoints = Record<string, Endpoint<any>>;

export type SimplePeer = {
  id: string;
  send(message: any): void;
};

export class LiveSolidServer {
  private closures = new Map<string, { payload: any; disposal: () => void }>();
  observers = new Map<string, Function>();

  constructor(public peer: SimplePeer) {}

  send<T>(message: WsMessage<WsMessageDown<T>>) {
    // console.log(`send`, message);
    this.peer.send(JSON.stringify(message));
  }

  handleMessage(message: WsMessage<WsMessageUp>) {
    if (message.type === "create") {
      this.create(message.id, message.name, message.input);
    }

    if (message.type === "subscribe") {
      this.subscribe(message.id, message.ref);
    }

    if (message.type === "dispose") {
      this.dispose(message.id);
    }

    if (message.type === "invoke") {
      this.invoke(message.id, message.ref, message.input);
    }

    if (message.type === "value") {
      this.observers.get(message.id)?.(message.value);
    }
  }

  async create(id: string, name: string, input?: SerializedThing) {
    const [filepath, functionName] = name.split("#");
    const module = await getManifest(import.meta.env.ROUTER_NAME).chunks[
      filepath
    ].import();
    const endpoint = module[functionName];

    if (!endpoint) throw new Error(`Endpoint ${name} not found`);

    const { payload, disposal } = createRoot((disposal) => {
      const deserializedInput =
        input?.__type === "memo"
          ? createSocketMemoConsumer(input, this)
          : input;

      const payload = endpoint(deserializedInput);

      return { payload, disposal };
    });

    this.closures.set(id, { payload, disposal });

    if (typeof payload === "function") {
      if (payload.type === "memo") {
        const value = createSeriazliedMemo({
          name,
          scope: id,
          initial: untrack(payload),
        });
        this.send({ value, id, type: "value" });
      } else {
        const value = createSeriazliedRef({
          name,
          scope: id,
        });
        this.send({ value, id, type: "value" });
      }
    } else {
      const value = Object.entries(payload).reduce((res, [name, value]) => {
        return {
          ...res,
          [name]:
            typeof value === "function"
              ? // @ts-expect-error
                value.type === "memo"
                ? createSeriazliedMemo({
                    name,
                    scope: id,
                    initial: untrack(() => value()),
                  })
                : createSeriazliedRef({ name, scope: id })
              : value,
        };
      }, {} as Record<string, any>);
      this.send({ value, id, type: "value" });
    }
  }

  invoke<I, O>(id: string, ref: SerializedRef<I, O>, input: I) {
    const closure = this.closures.get(ref.scope);
    if (!closure) throw new Error(`Callable ${ref.scope} not found`);
    const { payload } = closure;

    if (typeof payload === "function") {
      const response = payload(input);
      this.send({ id, value: response, type: "value" });
    } else {
      const response = payload[ref.name](input);
      this.send({ id, value: response, type: "value" });
    }
  }

  dispose(id: string) {
    // console.log(`Disposing ${id}`);
    const closure = this.closures.get(id);
    if (closure) {
      closure.disposal();
      this.closures.delete(id);
    }
  }

  subscribe<O>(id: string, ref: SerializedMemo<O>) {
    // console.log(`subscribe`, ref);

    const closure = this.closures.get(ref.scope);
    if (!closure) throw new Error(`Callable ${ref.scope} not found`);
    const { payload } = closure;

    const func = typeof payload === "function" ? payload : payload[ref.name];

    const response$ = observable(func);
    const sub = response$.subscribe((value) => {
      this.send({ id, value, type: "value" });
    });
    this.closures.set(id, { payload: sub, disposal: () => sub.unsubscribe() });
  }

  stream<O>(stream: SerializedStream<O>) {}

  cleanup() {
    for (const [key, closure] of this.closures.entries()) {
      // console.log(`Disposing ${key}`);
      closure.disposal();
      this.closures.delete(key);
    }
  }
}

function createSeriazliedRef(
  opts: Omit<SerializedRef, "__type">
): SerializedRef {
  return { ...opts, __type: "ref" };
}

export function createSocketFn<I, O>(
  fn: () => (i?: I) => O
): () => (i?: I) => Promise<O>;

export function createSocketFn<I, O>(
  fn: () => Record<string, (i?: I) => O>
): () => Record<string, (i?: I) => Promise<O>>;

export function createSocketFn<I, O>(
  fn: () => ((i: I) => O) | Record<string, (i: I) => O>
): () => ((i: I) => Promise<O>) | Record<string, (i: I) => Promise<O>> {
  return fn as any;
}

function createLazyMemo<T>(
  calc: (prev: T | undefined) => T,
  value?: T
): () => T {
  let isReading = false,
    isStale: boolean | undefined = true;

  const [track, trigger] = createSignal(void 0, { equals: false }),
    memo = createMemo<T>(
      (p) => (isReading ? calc(p) : ((isStale = !track()), p)),
      value as T,
      { equals: false }
    );

  return (): T => {
    isReading = true;
    if (isStale) isStale = trigger();
    const v = memo();
    isReading = false;
    return v;
  };
}

export function createSocketMemoConsumer<O>(
  ref: SerializedMemo<O>,
  server: LiveSolidServer
) {
  const inputSubId = crypto.randomUUID();

  const memo = createLazyMemo(() => {
    const [get, set] = createSignal<O>(ref.initial);
    server.observers.set(inputSubId, set);
    server.send({ type: "subscribe", id: inputSubId, ref });
    onCleanup(() => server.observers.delete(inputSubId));
    return get;
  });

  return () => memo()();
}

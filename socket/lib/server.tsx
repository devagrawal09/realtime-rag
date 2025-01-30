import { parse as parseCookie } from "cookie-es";
import type { Peer } from "crossws";
import { fromJSON, SerovalJSON, toJSON } from "seroval";
import {
  batch,
  createContext,
  createRoot,
  createSignal,
  observable,
  onCleanup,
  useContext,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { getManifest } from "vinxi/manifest";
import {
  deserializeReactivePayload,
  serializeReactivePayload,
} from "./serializer";
import {
  SerializedMemo,
  SerializedProjection,
  SerializedReactiveThing,
  SerializedRef,
  SerializedStream,
  WsMessage,
  WsMessageDown,
  WsMessageUp,
} from "./shared";
import { applyPatches, Patch } from "immer";

const peerCtx = createContext<Peer>();
export const usePeer = () => {
  const peer = useContext(peerCtx);
  if (!peer) throw new Error(`No peer context found`);
  return peer;
};

export function useCookies<T extends object = Record<string, string>>() {
  const peer = usePeer();

  let parsedCookies: T;
  const getParsedCookies = () => {
    if (parsedCookies) return parsedCookies;
    // @ts-expect-error
    return (parsedCookies = parseCookie(peer.headers.cookie || ``) as T);
  };

  return new Proxy({} as T, {
    get(_, path: string) {
      const cookies = getParsedCookies();
      // @ts-expect-error
      return cookies[path];
    },
  });
}

export type Callable<T> = (arg: unknown) => T | Promise<T>;

export type Endpoint<I> = (
  input: I
) => Callable<any> | Record<string, Callable<any>>;
export type Endpoints = Record<string, Endpoint<any>>;

export class LiveSolidServer {
  private closures = new Map<
    string,
    { refs?: Map<string, Function>; disposal: () => void }
  >();
  observers = new Map<string, (value: any) => void>();

  constructor(public peer: Peer) {}

  send<T>(message: WsMessage<WsMessageDown>) {
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

  async create(id: string, name: string, input?: SerovalJSON) {
    const [filepath, functionName] = name.split("#");
    const module = await getManifest(import.meta.env.ROUTER_NAME).chunks[
      filepath
    ].import();
    const endpoint = module[functionName];

    if (!endpoint) throw new Error(`Endpoint ${name} not found`);

    const { payload, disposal } = createRoot((disposal) => {
      const deserializedInput =
        input &&
        deserializeReactivePayload(input, {
          createSocketRefConsumer: (ref) => createSocketRefConsumer(ref, this),
          createSocketMemoConsumer: (ref) =>
            createSocketMemoConsumer(ref, this),
          createSocketProjectionConsumer: (ref) =>
            createSocketProjectionConsumer(ref, this),
        });

      let payload: any;
      peerCtx.Provider({
        value: this.peer,
        // @ts-expect-error
        children: () => (payload = endpoint(deserializedInput)),
      });

      return { payload, disposal };
    });

    const { refs, value } = serializeReactivePayload(id, payload);
    this.closures.set(id, { refs, disposal });
    this.send({ value, id, type: "value" });
  }

  async invoke<I, O>(id: string, ref: SerializedRef<I, O>, input: SerovalJSON) {
    const refFn = this.closures.get(ref.scope)!.refs!.get(ref.id)!;
    const fnInput = fromJSON(input);
    const arified = Array.isArray(fnInput) ? fnInput : [fnInput];
    const response = await refFn(...arified);
    const value = toJSON(response);
    this.send({ id: id, value, type: "value" });
  }

  dispose(id: string) {
    const closure = this.closures.get(id);
    if (closure) {
      closure.disposal();
      this.closures.delete(id);
    }
  }

  subscribe<O>(id: string, ref: SerializedReactiveThing<O>) {
    const source = this.closures.get(ref.scope)!.refs!.get(ref.id)!;

    const response$ = observable(() => source());

    const sub = response$.subscribe((payload) => {
      const value = toJSON(payload);
      this.send({ id, value, type: "value" });
    });

    this.closures.set(id, { disposal: () => sub.unsubscribe() });
  }

  stream<O>(stream: SerializedStream) {}

  cleanup() {
    for (const [key, closure] of this.closures.entries()) {
      // console.log(`Disposing ${key}`);
      closure.disposal();
      this.closures.delete(key);
    }
  }
}

function createSocketRefConsumer<I extends any[], O>(
  ref: SerializedRef,
  server: LiveSolidServer
) {
  const inputSubId = crypto.randomUUID();

  return (...payload: I) => {
    const input = toJSON(payload);

    server.send({ type: "invoke", id: inputSubId, ref, input });

    return new Promise<O>((res) => {
      server.observers.set(inputSubId, (value) => {
        res(fromJSON(value));
        server.observers.delete(inputSubId);
      });
    });
  };
}

function createSocketMemoConsumer<O>(
  ref: SerializedMemo<O>,
  server: LiveSolidServer
) {
  const inputSubId = crypto.randomUUID();

  const [signal, setSignal] = createSignal<O>(ref.initial!);
  server.observers.set(inputSubId, (value) => setSignal(() => fromJSON(value)));
  server.send({ type: "subscribe", id: inputSubId, ref });
  onCleanup(() => server.observers.delete(inputSubId));
  return signal;
}

function createSocketProjectionConsumer<O>(
  ref: SerializedProjection<O>,
  server: LiveSolidServer
) {
  const inputSubId = crypto.randomUUID();

  const [store, setStore] = createStore(ref.initial!);
  server.observers.set(inputSubId, (patches) => {
    setStore(
      produce((draft) => {
        applyPatches(draft, fromJSON<Patch[]>(patches));
      })
    );
  });
  server.send({ type: "subscribe", id: inputSubId, ref });
  onCleanup(() => server.observers.delete(inputSubId));
  return store;
}

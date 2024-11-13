import { createWritableMemo } from "@solid-primitives/memo";
import { createComputed, createMemo } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

export type EventId = string & { __brand?: "EventId" };
export type Event<T> = T & { _id: EventId };
export type EventLog<T> = Array<Event<T>>;

export function createClientEventLog<E>(serverLog: {
  serverEvents: () => EventLog<E> | undefined;
  appendEvent: (event: Event<E>, currentVersion: number) => Promise<any>;
}) {
  const [clientEvents, setClientEvents] = createWritableMemo<EventLog<E>>(
    (c = []) => [
      ...c,
      ...(serverLog.serverEvents() || []).filter(
        (e) => !c.find((ce) => ce._id === e._id)
      ),
    ]
  );

  async function appendEvent(e: E) {
    const _id = crypto.randomUUID() as EventId;
    const currentVersion = clientEvents().length;
    const event = { ...e, _id };
    setClientEvents((b) => [...b, event]);
    await serverLog.appendEvent(event, currentVersion);
  }

  return { appendEvent, events: clientEvents };
}

export function createEventProjection<E, S extends object = {}>(
  eventLog: () => EventLog<E>,
  reducer: (acc: S, e: E) => S,
  init: S
) {
  const [projection, setProjection] = createStore<S>(structuredClone(init));
  createComputed(() =>
    setProjection(reconcile(eventLog().reduce(reducer, structuredClone(init))))
  );
  return projection;
}

export function createEventComputed<E, S>(
  eventLog: () => EventLog<E>,
  reducer: (acc: S, e: E) => S,
  init: S
) {
  return createMemo(() => eventLog().reduce(reducer, init));
}

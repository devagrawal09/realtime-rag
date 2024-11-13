import { createSignal, Setter } from "solid-js";
import type { Event, EventLog } from ".";

export type LogId = string & { __brand?: "LogId" };

export const createServerLog = <E>() => {
  const signal = createSignal<Record<LogId, EventLog<E>>>({});
  return signal;
};

export function createServerEventLog<E>(
  logKey: () => LogId | undefined,
  eventLogs: () => Record<LogId, EventLog<E>>,
  setEventLogs: Setter<Record<LogId, EventLog<E>>>
) {
  async function appendEvent(event: Event<E>, currentVersion: number) {
    const id = logKey();
    if (!id) return;

    const log = eventLogs()[id];
    if (!log) return setEventLogs((b) => ({ ...b, [id]: [event] }));

    if (log.length !== currentVersion) return;

    return setEventLogs((b) => ({
      ...b,
      [id]: [...log, event],
    }));
  }

  return {
    serverEvents: () => eventLogs()[logKey()!],
    appendEvent,
  };
}

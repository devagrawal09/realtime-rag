import type { Event, EventLog } from ".";

export type LogId = string & { __brand?: "LogId" };

export function createServerEventLog<E>(
  logKey: () => LogId | undefined,
  eventLogs: () => Record<LogId, EventLog<E>>,
  setEventLogs: (data: Record<LogId, EventLog<E>>) => void
) {
  async function appendEvent(event: Event<E>, currentVersion: number) {
    const id = logKey();
    if (!id) return;

    const log = eventLogs()[id];
    if (!log) return setEventLogs({ ...eventLogs(), [id]: [event] });

    if (log.length !== currentVersion) return;

    return setEventLogs({
      ...eventLogs(),
      [id]: [...log, event],
    });
  }

  return {
    serverEvents: () => eventLogs()[logKey()!],
    appendEvent,
  };
}

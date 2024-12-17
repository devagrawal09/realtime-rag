import type { Event, EventLog } from ".";

export type LogId = string & { __brand?: "LogId" };

export function createServerEventLog<E>(
  logKey: () => LogId | undefined,
  eventLogs: () => Record<LogId, EventLog<E>>,
  setEventLogs: (data: Record<LogId, EventLog<E>>) => void,
  onEvent: (event: Event<E>) => void = () => {}
) {
  async function appendEvent(event: Event<E>, currentVersion: number) {
    const id = logKey();
    if (!id) return;

    const log = eventLogs()[id];
    if (!log) {
      setEventLogs({ ...eventLogs(), [id]: [event] });
      onEvent(event);
      return;
    }

    if (log.length !== currentVersion) return;

    setEventLogs({
      ...eventLogs(),
      [id]: [...log, event],
    });
    onEvent(event);
  }

  return {
    serverEvents: () => eventLogs()[logKey()!] || [],
    appendEvent,
  };
}

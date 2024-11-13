import { eventHandler, getSession } from "vinxi/http";
import { LiveSolidServer } from "../lib/server";
import { WsMessage, WsMessageUp } from "../lib/shared";
import { setTimeout } from "timers/promises";

const clients = new Map<string, LiveSolidServer>();

export default eventHandler({
  handler() {},
  websocket: {
    open(peer) {
      clients.set(peer.id, new LiveSolidServer(peer));
    },
    async message(peer, e) {
      const message = JSON.parse(e.text()) as WsMessage<WsMessageUp>;
      const client = clients.get(peer.id);
      if (!client) return;
      await setTimeout(1000);
      client.handleMessage(message);
    },
    async close(peer) {
      const client = clients.get(peer.id);
      if (!client) return;
      client.cleanup();
      clients.delete(peer.id);
    },
  },
});

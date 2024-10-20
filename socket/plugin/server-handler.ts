import { eventHandler } from "vinxi/http";
import { LiveSolidServer } from "../lib/server";
import { WsMessage, WsMessageUp } from "../lib/shared";

const clients = new Map<string, LiveSolidServer>();

export default eventHandler({
  handler() {},
  websocket: {
    open(peer) {
      clients.set(peer.id, new LiveSolidServer(peer));
    },
    message(peer, e) {
      const message = JSON.parse(e.text()) as WsMessage<WsMessageUp>;
      const client = clients.get(peer.id);
      if (!client) return;
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

import { defineConfig } from "@solidjs/start/config";
import { SolidSocketFnsPlugin, importsPlugin } from "./socket";

export default defineConfig({
  ssr: false,
  server: { experimental: { websocket: true } },
  vite: { plugins: [SolidSocketFnsPlugin.client] },
}).addRouter({
  name: "socket-fns",
  type: "http",
  base: "/_ws",
  handler: "./socket/plugin/server-handler.ts",
  target: "server",
  plugins: () => [SolidSocketFnsPlugin.server, importsPlugin()],
});

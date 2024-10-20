import { defineConfig } from "@solidjs/start/config";
import { client, router } from "./socket";

export default defineConfig({
  ssr: false,
  server: { experimental: { websocket: true } },
  vite: { plugins: [client()] },
}).addRouter(router);

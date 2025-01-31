import { normalize } from "vinxi/lib/path";
export { client } from "./plugin/client";
import { fileURLToPath } from "url";
export { importsPlugin } from "./imports";
import { createTanStackServerFnPlugin } from "@tanstack/server-functions-plugin";

export const SolidSocketFnsPlugin = createTanStackServerFnPlugin({
  // This is the ID that will be available to look up and import
  // our server function manifest and resolve its module
  manifestVirtualImportId: "socket:fn-manifest",
  client: {
    getRuntimeCode: () =>
      `import { createServerReference } from "${normalize(
        fileURLToPath(
          new URL("./socket/plugin/client-runtime.js", import.meta.url)
        )
      )}"`,
    replacer: (opts) =>
      `createServerReference(${() => {}}, '${opts.functionId}', '${
        opts.extractedFilename
      }')`,
  },
  ssr: {
    getRuntimeCode: () =>
      `import { createServerReference } from '${normalize(
        fileURLToPath(
          new URL("../dist/runtime/server-runtime.js", import.meta.url)
        )
      )}'`,
    replacer: (opts) =>
      `createServerReference(${opts.fn}, '${opts.functionId}', '${opts.extractedFilename}')`,
  },
  server: {
    getRuntimeCode: () =>
      `import { createServerReference } from '${normalize(
        fileURLToPath(
          new URL("../dist/runtime/server-runtime.js", import.meta.url)
        )
      )}'`,
    replacer: (opts) =>
      `createServerReference(${opts.fn}, '${opts.functionId}', '${opts.extractedFilename}')`,
  },
});

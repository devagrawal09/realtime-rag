import { createEndpoint } from "../lib/client";

export function createServerReference(fn, id, name) {
  // console.log("createServerReference", id, name);
  return (input) => createEndpoint(`${id}#${name}`, input);
}

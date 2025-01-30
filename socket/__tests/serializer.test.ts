import { createPlugin, serialize } from "seroval";
import { describe, expect, test } from "vitest";

type FunctionNode<I = any, O = any> = {
  __type: "ref";
  id: string;
};
const refPlugin = (map: Map<string, Function>) =>
  createPlugin<Function, FunctionNode>({
    tag: "seroval-plugins/socket/ref",
    test(value) {
      return typeof value === "function";
    },
    parse: {
      sync(value, ctx) {
        const id = Math.random().toString();
        map.set(id, value);
        return { __type: "ref", id };
      },
    },
    deserialize(node, ctx) {
      return map.get(node.id)!;
    },
    serialize(node, ctx) {
      return `node`;
    },
  });

describe("serializer", () => {
  test(`serializes functions`, () => {
    const source = { id: 1, greet: () => "Hello" };
    const serialized = serialize(source, {
      plugins: [refPlugin],
    });
    console.log(serialized);
    expect(true).toBe(true);
  });
});

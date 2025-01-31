import { SerializedRef } from "../lib/shared";

export type Node =
  | string
  | {
      type: "div" | "h1" | "button" | "p";
      onClick?: SerializedRef;
      style?: Record<string, string>;
      children: Node[];
    };

export type Node =
  | string
  | {
      type: "div" | "p";
      children: Node[];
    };

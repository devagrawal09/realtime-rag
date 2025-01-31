import { createEffect, createMemo, createRenderEffect, For } from "solid-js";
import { useCounter } from "~/lib/counter";
import { Node } from "../../socket/renderer";

function renderNode(node: Node) {
  if (typeof node !== "string") {
    const el = document.createElement(node.type);
    node.children.forEach((child) => {
      const el2 = renderNode(child);
      el.append(el2);
    });
    if (node.style)
      Object.keys(node.style).forEach((style) => {
        el.style[style] = node.style[style];
      });

    if (node.onClick) {
      el.onclick = () => node.onClick();
    }
    return el;
  }
  return node;
}

export function Counter() {
  const counter = useCounter();

  const ui = createMemo(() => {
    const uiData = counter.ui();
    console.log(`uiData`, uiData);
    if (uiData) {
      return renderNode(uiData);
    }
  });

  createEffect(() => console.log(`ui`, ui()));

  return (
    <>
      <div>
        <h1>Counter</h1>
        <button
          style={{
            "background-color": "yellow",
            padding: "5px 10px",
            border: "1px solid grey",
            "border-radius": "5px",
          }}
          onClick={() => counter.increment()}
        >
          Count {counter.count()}
        </button>
      </div>
      {JSON.stringify(counter.ui())}
      {ui()}
    </>
  );
}

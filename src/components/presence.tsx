import { Tooltip } from "@kobalte/core/tooltip";
import {
  useMousePosition,
  createPositionToElement,
} from "@solid-primitives/mouse";
import {
  createComputed,
  For,
  createSignal,
  createEffect,
  ParentProps,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { usePresence, PresenceUser } from "~/lib/presence";
import { createSocketMemo } from "../../socket/lib/shared";
import { throttle } from "@solid-primitives/scheduled";
import { RiDevelopmentCursorLine } from "solid-icons/ri";

export function PresenceHost(props: ParentProps<{ docId?: string }>) {
  let ref: HTMLElement | undefined;
  const mousePos = createDebouncedMousePos(() => ref);
  const userPos = () => ({ docId: props.docId, ...mousePos() });
  const users = usePresence(createSocketMemo(userPos));
  const [presenceStore, setPresenceStore] = createStore<PresenceUser[]>([]);

  createComputed(() =>
    setPresenceStore(reconcile(Object.values(users() || {})))
  );

  return (
    <>
      <p>
        If another user has this list open and you don't see their cursor,
        please ask them to refresh! This is a known bug that will be fixed soon.
      </p>
      <div style={{ "text-align": "right", height: "0", padding: "5px 0" }}>
        <For each={presenceStore}>
          {(user) => {
            return (
              <Tooltip>
                <Tooltip.Trigger>
                  <div
                    style={{
                      "background-color": `#${user.color}`,
                      "border-radius": "50%",
                      width: "30px",
                      height: "30px",
                      display: "inline-block",
                      "text-align": "center",
                      "line-height": "30px",
                      color: "white",
                      "font-weight": "bold",
                      "margin-right": "5px",
                      "font-size": "12px",
                    }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    style={{
                      "background-color": `#${user.color}`,
                      color: "white",
                      "border-radius": "5px",
                      padding: "5px",
                    }}
                  >
                    <Tooltip.Arrow />
                    {user.name}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            );
          }}
        </For>
      </div>
      <section class="todoapp" ref={ref}>
        <For each={presenceStore}>
          {(user) => {
            return (
              <div
                class="user"
                style={{
                  position: "absolute",
                  left: `${user.x}px`,
                  top: `${user.y}px`,
                  color: `#${user.color}`,
                  "font-size": "25px",
                }}
              >
                <RiDevelopmentCursorLine />
              </div>
            );
          }}
        </For>
        {props.children}
      </section>
    </>
  );
}

function createDebouncedMousePos(ref: () => HTMLElement | undefined) {
  const pos = useMousePosition();
  const relative = createPositionToElement(ref, () => pos);
  const [debouncedPos, setDebouncedPos] = createSignal<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });
  const trigger = throttle(
    (pos: { x: number; y: number }) => setDebouncedPos(pos),
    10
  );
  createEffect(() => {
    const { x, y } = relative;
    x && y && trigger({ x, y });
  });
  return debouncedPos;
}

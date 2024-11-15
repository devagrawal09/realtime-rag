import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useInvites } from "~/lib/todos";

export function Invites() {
  const serverInvites = useInvites();

  return (
    <div
      style={{
        "text-align": "center",
        "margin-top": "100px",
        "font-size": "20px",
      }}
    >
      <p>Invite someone to your list!</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          serverInvites.addInvite(
            new FormData(e.currentTarget).get("invite") as string
          );
          e.currentTarget.reset();
        }}
      >
        <input
          placeholder="Username"
          name="invite"
          style={{
            "background-color": "#f2f2f2",
            border: "1px solid grey",
            "border-radius": "5px",
            color: "black",
            padding: "15px 32px",
            "text-align": "center",
            "text-decoration": "none",
            display: "inline-block",
            "font-size": "16px",
            margin: "4px 2px",
          }}
        />
      </form>
      <Show when={serverInvites.inviteds()?.length}>
        <h4>Invited</h4>
        <For each={serverInvites.inviteds() || []}>
          {(invite) => (
            <div>
              {invite}
              <button
                onClick={() => serverInvites.removeInvite(invite)}
                style={{
                  "background-color": "red",
                  border: "none",
                  "border-radius": "50%",
                  color: "white",
                  padding: "12px 15px",
                  "text-align": "center",
                  "text-decoration": "none",
                  display: "inline-block",
                  "font-size": "16px",
                  margin: "4px",
                  cursor: "pointer",
                }}
              >
                X
              </button>
            </div>
          )}
        </For>
      </Show>
      <Show when={serverInvites.invites()?.length}>
        <h4>Invites</h4>
        <For each={serverInvites.invites() || []}>
          {(invite) => (
            <div>
              <A href={`/${invite}`}>{invite}</A>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}

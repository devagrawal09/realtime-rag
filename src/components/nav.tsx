import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { useUser } from "~/context/UserContext";

export function NavComponent() {
  const { username, logout } = useUser();

  return (
    <div class="flex h-0 justify-between p-4">
      <div></div>
      <div>
        <Show
          when={username()}
          fallback={
            <A href="/login" class="text-blue-500">
              Login
            </A>
          }
        >
          <div>
            Welcome, {username()}!
            <button onClick={logout} class="ml-4 text-blue-500">
              Logout
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}

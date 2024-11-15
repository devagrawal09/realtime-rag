import { createAsync, type RouteSectionProps } from "@solidjs/router";
import { Show } from "solid-js";
import { Login } from "~/components/auth";
import { Invites } from "~/components/invites";
import { PresenceHost } from "~/components/presence";
import { TodoApp, TodosFilter } from "~/components/todos";
import { getUserId } from "~/lib/auth";

export default function TodoAppPage(props: RouteSectionProps) {
  const userId = createAsync(() => getUserId());

  return (
    <Show when={userId()} fallback={<Login />}>
      <PresenceHost>
        <TodoApp filter={props.location.query.show as TodosFilter} />
      </PresenceHost>
      <Invites />
    </Show>
  );
}

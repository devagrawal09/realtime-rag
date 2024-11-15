import { RouteSectionProps } from "@solidjs/router";
import { PresenceHost } from "~/components/presence";
import { TodoApp, TodosFilter } from "~/components/todos";

export default function TodoAppPage(props: RouteSectionProps) {
  return (
    <PresenceHost docId={props.params.userId}>
      <TodoApp
        filter={props.location.query.show as TodosFilter}
        listId={props.params.userId}
      />
    </PresenceHost>
  );
}

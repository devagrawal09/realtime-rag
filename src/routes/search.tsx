import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "~/components/ui/text-field";
import { debounce } from "@solid-primitives/scheduled";
import { useGallery, useSearch } from "~/lib/hackathon";
import { createSocketMemo } from "../../socket/lib/shared";
import { A } from "@solidjs/router";
import { createClientEventLog } from "../../socket/events";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function ProjectSearch() {
  const [_query, setQuery] = createSignal(``);

  const query = createDebouncedMemo(() => _query(), 1000);

  const results = useSearch(createSocketMemo(query));

  const { events } = createClientEventLog(useGallery());

  return (
    <div class="container mx-auto px-8 py-8">
      <div class="flex items-center mb-2 justify-between">
        <h1 class="text-4xl font-bold">Project Search</h1>
      </div>
      <div class="mb-8">
        <A href="/" class="text-blue-500 hover:underline">
          &larr;
          <span class="ml-2">Back to all projects</span>
        </A>
      </div>

      <TextField onChange={setQuery} value={_query()}>
        <TextFieldLabel>Enter a query for semantic search</TextFieldLabel>
        <TextFieldInput placeholder="Mobile app built for banks and restaurants to join virtual queues..." />
      </TextField>

      <Show
        when={results()?.length}
        fallback={
          <div class="mt-8">
            <Show
              when={_query()}
              fallback={
                <p class="text-gray-500">
                  Enter a query to search for projects
                </p>
              }
            >
              <p class="text-gray-500">No results found</p>
            </Show>
          </div>
        }
      >
        <div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <For each={results()}>
            {(p) => {
              const project = createMemo(() =>
                events()
                  .filter((e) => e.type === "ProjectSubmitted")
                  .find((e) => e.projectId === p._id)
              );
              const desc = () =>
                (project()?.description.length || 0) > 100
                  ? project()?.description.substring(0, 100) + `...`
                  : project()?.description;

              return (
                <A href={`/projects/${p._id}`}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{project()?.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{desc()}</p>
                    </CardContent>
                    <CardFooter>
                      <p>
                        Similarity: {((p.$similarity || 0) * 100).toFixed(1)} %
                      </p>
                    </CardFooter>
                  </Card>
                </A>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

function createDebouncedMemo<T>(source: () => T, wait: number) {
  const [signal, setSignal] = createSignal<T>();

  const debouncedSetSignal = debounce(
    (value: T) => setSignal(() => value),
    wait
  );

  createEffect(() => debouncedSetSignal(source()));

  return signal;
}

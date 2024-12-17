import { A } from "@solidjs/router";
import { createEffect, createMemo, For, Show } from "solid-js";
import { ProjectCard } from "~/components/projects/ProjectCard";
import { Button } from "~/components/ui/button";
import { useUser } from "~/context/UserContext";
import { useGallery } from "~/lib/hackathon";
import {
  createClientEventLog,
  createEventProjection,
} from "../../socket/events";
// import {
//   TextField,
//   TextFieldInput,
//   TextFieldLabel,
// } from "~/components/ui/text-field";

type Category = {
  title: string;
  categoryId: string;
};

type Project = {
  projectId: string;
  categoryId: string;
  title: string;
  description: string;
  author: string;
};

type Review = {
  projectId: string;
  author: string;
  rating: number;
  comment: string;
};

export default function ProjectGallery() {
  const { username } = useUser();

  const serverLog = useGallery();
  const { events } = createClientEventLog(serverLog);
  createEffect(() => console.log(`ev`, events()));

  const gallery = createEventProjection(
    events,
    (acc, e) => {
      if (e.type === "ProjectSubmitted") {
        acc.projects.push(e);
      }
      if (e.type === "CategoryCreated") {
        acc.categories.push(e);
      }
      if (e.type === "ProjectReviewed") {
        acc.reviews.push(e);
      }

      return acc;
    },
    {
      reviews: [] as Review[],
      projects: [] as Project[],
      categories: [] as Category[],
    }
  );

  return (
    <div class="container mx-auto px-8 py-8">
      <div class="mb-8 flex gap-2 items-center justify-between">
        <h1 class="text-4xl font-bold">Hackathon Project Showcase</h1>
        <div class="grow"></div>
        <Button as={A} href="/search">
          Search
        </Button>
        <Show when={username()}>
          <Button as={A} href="/submit">
            Submit
          </Button>
        </Show>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Show
          when={gallery.projects.length}
          fallback={
            <div class="col-span-full text-center text-gray-500">
              No projects submitted yet.
            </div>
          }
        >
          <For each={gallery.projects}>
            {(project, i) => {
              const category = createMemo(
                () =>
                  gallery.categories.find(
                    (c) => c.categoryId === project.categoryId
                  )?.title || ``
              );

              const totalRating = () =>
                gallery.reviews
                  .filter((r) => r.projectId === project.projectId)
                  .reduce((acc, r) => acc + r.rating, 0);

              const ratingCount = () =>
                gallery.reviews.filter((r) => r.projectId === project.projectId)
                  .length || 0;

              const rating = createMemo(() => totalRating() / ratingCount());

              return (
                <ProjectCard
                  i={i()}
                  project={{
                    ...project,
                    category: category(),
                    rating: rating(),
                  }}
                />
              );
            }}
          </For>
        </Show>
      </div>
      {/* <Button
        variant="destructive"
        onClick={async () => {
          serverLog.generateRandomData();
        }}
      >
        Generate Random Data
      </Button> */}
      {/* <div class="mt-8 grid grid-cols-2 gap-8">
        <form
          class="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            const title = formData.get("category") as string;

            if (!title) return alert(`Title is required`);

            await appendEvent({
              type: `CategoryCreated`,
              categoryId: crypto.randomUUID(),
              title,
            });

            form.reset();
          }}
        >
          <TextField>
            <TextFieldLabel for="category">Category Title</TextFieldLabel>
            <TextFieldInput name="category" placeholder="Enter Category" />
          </TextField>
          <Button type="submit">Create Category</Button>
        </form>
      </div> */}
    </div>
  );
}

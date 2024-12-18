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

  const { events } = createClientEventLog(useGallery());
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
    </div>
  );
}

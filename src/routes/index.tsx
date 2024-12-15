import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { ProjectCard } from "~/components/projects/ProjectCard";
import { Button } from "~/components/ui/button";
import { useUser } from "~/context/UserContext";

export default function ProjectGallery() {
  const projects = () => [] as any[];
  const categories = () => [] as any[];
  const reviews = () => [] as any[];
  const { username } = useUser();

  return (
    <div class="container mx-auto px-8 py-8">
      <div class="mb-8 flex items-center justify-between">
        <h1 class="text-4xl font-bold">Hackathon Project Showcase</h1>
        <Show when={username()}>
          <Button as={A} href="/submit">
            Submit Project
          </Button>
        </Show>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 && (
          <div class="col-span-full text-center text-gray-500">
            No projects submitted yet.
          </div>
        )}
        <For each={projects()}>
          {(project, i) => (
            <ProjectCard
              i={i()}
              project={{
                ...project,
                category: categories().find(
                  (c) => c.categoryId === project.categoryId
                )!.title,
                rating:
                  reviews()
                    .filter((r) => r.projectId === project.projectId)
                    .reduce((acc, r) => acc + r.rating, 0) /
                    reviews().filter((r) => r.projectId === project.projectId)
                      .length || 0,
              }}
            />
          )}
        </For>
      </div>
      <Button
        variant="destructive"
        onClick={async () => {
          console.log(`Cleared DB`);
        }}
      >
        Clear
      </Button>
      {/* <div class="mt-8 grid grid-cols-2 gap-8">
        <form
          class="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const title = formData.get("category") as string;

            await createCategory({ data: title });
            router.invalidate();
          }}
        >
          <Label class="mt-2" htmlFor="category">
            Category
          </Label>
          <Input type="text" name="category" placeholder="Enter Category Name" />
          <Button type="submit">Create Category</Button>
        </form>
      </div> */}
    </div>
  );
}

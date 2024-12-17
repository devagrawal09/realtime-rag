import { A, useNavigate } from "@solidjs/router";
import { SubmitProjectForm } from "~/components/projects/SubmitProjectForm";
import {
  createClientEventLog,
  createEventProjection,
} from "../../socket/events";
import { useGallery } from "~/lib/hackathon";

export default function SubmitProjectPage() {
  const nav = useNavigate();
  const { events, appendEvent } = createClientEventLog(useGallery());

  const categories = createEventProjection(
    events,
    (acc, e) => {
      if (e.type === "CategoryCreated") {
        acc.push({ categoryId: e.categoryId, title: e.title });
      }

      return acc;
    },
    [] as { categoryId: string; title: string }[]
  );

  const handleProjectSubmit = async (data: {
    title: string;
    description: string;
    categoryId: string;
    author: string;
  }) => {
    const projectId = crypto.randomUUID();
    await appendEvent({
      type: `ProjectSubmitted`,
      projectId,
      ...data,
    });
    nav(`/projects/${projectId}`);
  };

  return (
    <div class="container mx-auto px-4 py-8">
      <A href="/" class="text-blue-500 hover:underline">
        &larr;
        <span class="ml-2">Back to all projects</span>
      </A>
      <div class="flex flex-col gap-2">
        <h1 class="mb-8 text-center text-4xl font-bold">Submit Your Project</h1>
        <SubmitProjectForm
          onSubmit={handleProjectSubmit}
          categories={categories}
        />
      </div>
    </div>
  );
}

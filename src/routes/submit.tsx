import { A, useNavigate } from "@solidjs/router";
import { SubmitProjectForm } from "~/components/projects/SubmitProjectForm";

export default function SubmitProjectPage() {
  const nav = useNavigate();

  const handleProjectSubmit = async (data: {
    title: string;
    description: string;
    categoryId: string;
    author: string;
  }) => {
    // const projectId = await submitProject(data);
    const projectId = ``;
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
        <SubmitProjectForm onSubmit={handleProjectSubmit} />
      </div>
    </div>
  );
}

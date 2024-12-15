import { ReviewForm } from "~/components/projects/ReviewForm";
import { ReviewsDisplay } from "~/components/projects/ReviewsDisplay";
import { Card, CardContent } from "~/components/ui/card";
import { useUser } from "~/context/UserContext";
import { A, useParams } from "@solidjs/router";
import { Show } from "solid-js";

export default function ProjectDetails() {
  const params = useParams<{ projectId: string }>();
  const { username } = useUser();

  const projectData = () => ({} as any);
  const projectSummary = () => ({} as any);
  const reviews = () => [] as any[];
  const hasReviewed = () => [] as any[];

  return (
    <div class="container mx-auto px-8">
      <A href="/" class="text-blue-500 hover:underline">
        &larr;
        <span class="ml-2">Back to all projects</span>
      </A>
      <div class="mt-6">
        <h2 class="relative mb-4 text-3xl font-semibold">
          {projectData().title}
        </h2>
        <p class="mb-4">{projectData().description}</p>
        <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <Show when={username() && !hasReviewed()}>
              <div class="mb-4">
                <h3 class="mb-4 text-2xl font-semibold">Leave a Review</h3>
                <ReviewForm
                  onSubmit={(d) => {
                    // reviewProject({
                    //   projectId: id,
                    //   ...d,
                    //   author: username,
                    // });
                  }}
                />
              </div>
            </Show>
            <h3 class="mb-4 text-2xl font-semibold">Reviews</h3>
            <ReviewsDisplay reviews={reviews()} />
          </div>
          <div>
            <h3 class="mb-4 text-2xl font-semibold">AI Summary</h3>
            <Card>
              <CardContent class="pt-4">
                <p>
                  <Show
                    when={projectSummary()}
                    fallback={`Generating AI summary...`}
                  >
                    {projectSummary()?.summary}
                  </Show>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

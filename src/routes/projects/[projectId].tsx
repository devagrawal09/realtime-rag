import { ReviewForm } from "~/components/projects/ReviewForm";
import { ReviewsDisplay } from "~/components/projects/ReviewsDisplay";
import { Card, CardContent } from "~/components/ui/card";
import { useUser } from "~/context/UserContext";
import { A, useParams } from "@solidjs/router";
import { createMemo, Show } from "solid-js";
import {
  createClientEventLog,
  createEventComputed,
} from "../../../socket/events";
import { useGallery } from "~/lib/hackathon";

export default function ProjectDetails() {
  const params = useParams<{ projectId: string }>();
  const { username } = useUser();

  const { events, appendEvent } = createClientEventLog(useGallery());

  const projectData = createMemo(() =>
    events()
      .filter((e) => e.type === "ProjectSubmitted")
      .find((e) => e.projectId === params.projectId)
  );

  const reviews = createMemo(() =>
    events()
      .filter((e) => e.type === "ProjectReviewed")
      .filter((e) => e.projectId === params.projectId)
  );

  const hasReviewed = createMemo(() =>
    reviews().some((r) => r.author === username())
  );

  const projectSummary = createEventComputed(
    events,
    (acc, e) => {
      if (
        e.type === "ProjectSummaryUpdated" &&
        e.projectId === params.projectId
      )
        return e.summary;

      return acc;
    },
    ``
  );

  return (
    <Show when={projectData()}>
      {(projectData) => (
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
                        appendEvent({
                          type: `ProjectReviewed`,
                          projectId: projectData().projectId,
                          author: username()!,
                          ...d,
                        });
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
                        {projectSummary()}
                      </Show>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
}

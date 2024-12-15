import { Card, CardContent } from "~/components/ui/card";
import { Project } from "./ProjectCard";
import { Show } from "solid-js";
import { createAsync } from "@solidjs/router";

// Simulated AI summary generation
function generateAISummary(project: Project) {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(`This innovative project titled "${
        project.title
      }" aims to ${project.description.toLowerCase()}.
      Created by ${
        project.author
      }, it has received positive feedback from the community,
      with an average rating of ${project.rating.toFixed(1)} out of 5.
      The project shows great potential and addresses a significant need in its target market.`);
    }, 1000);
  });
}

export function AISummary(props: { project: Project }) {
  const summary = createAsync(() => generateAISummary(props.project));

  return (
    <Card>
      <CardContent class="pt-4">
        <Show when={summary()} fallback={<p>Generating AI summary...</p>}>
          <p>{summary()}</p>
        </Show>
      </CardContent>
    </Card>
  );
}

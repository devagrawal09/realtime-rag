import { A } from "@solidjs/router";
import { AiFillStar } from "solid-icons/ai";
import { Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export type Project = {
  projectId: string;
  title: string;
  description: string;
  rating: number;
  author: string;
  category: string;
};

export function ProjectCard(props: { project: Project; i: number }) {
  return (
    <A href={`/projects/${props.project.projectId}`}>
      <Card class="transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle>{props.project.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="mb-4 text-sm text-muted-foreground">
            {props.project.description.length > 100
              ? props.project.description.substring(0, 100) + "..."
              : props.project.description}
          </p>
          <span class="mb-2 rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold">
            {props.project.category}
          </span>
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center">
              <Show
                when={props.project.rating}
                fallback={
                  <span class="text-sm text-muted-foreground">
                    No reviews yet
                  </span>
                }
              >
                <>
                  <AiFillStar class="mr-1 h-5 w-5 text-yellow-400" />
                  <span>{props.project.rating.toFixed(1)}</span>
                </>
              </Show>
            </div>
          </div>
        </CardContent>
      </Card>
    </A>
  );
}

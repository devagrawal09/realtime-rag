import { Card, CardContent } from "~/components/ui/card";
import { AiFillStar } from "solid-icons/ai";
import { For, Show } from "solid-js";

export type Review = {
  projectId: string;
  rating: number;
  comment: string;
  author: string;
};

export function ReviewsDisplay(props: { reviews: Review[] }) {
  return (
    <div class="space-y-4">
      <Show
        when={props.reviews.length !== 0}
        fallback={<p>No reviews yet. Be the first to review!</p>}
      >
        <For each={props.reviews}>
          {(review) => (
            <Card>
              <CardContent class="pt-4">
                <div class="mb-2 flex items-center">
                  <div class="mr-2 flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <AiFillStar
                        class={`h-5 w-5 ${
                          star <= review.rating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span class="font-semibold">{review.author}</span>
                </div>
                <p>{review.comment}</p>
              </CardContent>
            </Card>
          )}
        </For>
      </Show>
    </div>
  );
}

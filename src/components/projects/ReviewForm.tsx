import { createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { AiFillStar } from "solid-icons/ai";

export function ReviewForm(props: {
  onSubmit: (review: { rating: number; comment: string }) => void;
}) {
  const [rating, setRating] = createSignal(0);
  const [comment, setComment] = createSignal("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit({ rating: rating(), comment: comment() });
        setRating(0);
        setComment("");
      }}
      class="space-y-4"
    >
      <div>
        <Label for="rating">Rating</Label>
        <div class="mt-1 flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <AiFillStar
              class={`h-6 w-6 cursor-pointer ${
                star <= rating() ? "text-yellow-400" : "text-gray-300"
              }`}
              onClick={() => setRating(star)}
            />
          ))}
        </div>
      </div>
      <div>
        <Label for="comment">Comment</Label>
        <textarea
          id="comment"
          value={comment()}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this project..."
          class="mt-1"
        />
      </div>
      <Button
        type="submit"
        disabled={rating() === 0 || comment().trim() === ""}
      >
        Submit Review
      </Button>
    </form>
  );
}

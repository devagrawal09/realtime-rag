import { Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from "~/components/ui/text-field";
import { useUser } from "~/context/UserContext";

export function SubmitProjectForm(props: {
  onSubmit: (data: {
    title: string;
    description: string;
    categoryId: string;
    author: string;
  }) => void;
}) {
  const { username } = useUser();

  const categories = () => [] as any[];

  return (
    <Show when={username()}>
      <form
        class="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const title = formData.get("title") as string;
          const description = formData.get("description") as string;
          const categoryId = formData.get("categoryId") as string;

          props.onSubmit({
            title,
            description,
            categoryId,
            author: username()!,
          });
        }}
      >
        <TextField>
          <TextFieldLabel for="title">Project Title</TextFieldLabel>
          <TextFieldInput id="title" placeholder="Enter Title" />
        </TextField>

        <TextField>
          <TextFieldLabel for="description">Project Description</TextFieldLabel>
          <TextFieldTextArea id="description" placeholder="Enter Description" />
        </TextField>

        <Label for="categoryId">Category</Label>
        <Select
          id="categoryId"
          options={categories().map((c) => c.title)}
          placeholder="Category"
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
          )}
        >
          <SelectTrigger>
            <SelectValue<string>>
              {(state) => state.selectedOption()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>

        <Button type="submit">Submit Project</Button>
      </form>
    </Show>
  );
}

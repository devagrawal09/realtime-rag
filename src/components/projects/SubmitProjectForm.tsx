import { Select as KSelect } from "@kobalte/core/select";
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
  categories: { categoryId: string; title: string }[];
}) {
  const { username } = useUser();

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

          if (!title || !description || !categoryId) {
            alert("Please fill all the fields");
            return;
          }
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
          <TextFieldInput name="title" placeholder="Enter Title" />
        </TextField>

        <TextField>
          <TextFieldLabel for="description">Project Description</TextFieldLabel>
          <TextFieldTextArea
            name="description"
            placeholder="Enter Description"
          />
        </TextField>

        <Label for="categoryId">Category</Label>
        <Select
          name="categoryId"
          options={props.categories.map((c) => c.categoryId)}
          placeholder="Category"
          itemComponent={(p) => (
            <SelectItem item={p.item}>
              {
                props.categories.find((c) => c.categoryId === p.item.rawValue)
                  ?.title
              }
            </SelectItem>
          )}
        >
          <KSelect.HiddenSelect />
          <SelectTrigger>
            <SelectValue<string>>
              {(state) =>
                props.categories.find(
                  (c) => c.categoryId === state.selectedOption()
                )?.title
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>

        <Button type="submit">Submit Project</Button>
      </form>
    </Show>
  );
}

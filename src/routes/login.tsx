import { useNavigate } from "@solidjs/router";
import { useUser } from "~/context/UserContext";

export default function LoginPage() {
  const { login } = useUser();
  const navigate = useNavigate();

  return (
    <div class="container mx-auto px-4 py-8">
      <h1 class="mb-4 text-2xl font-bold">Login</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const username = formData.get("username") as string;
          login(username);
          navigate(`/`);
        }}
      >
        <input
          type="text"
          placeholder="Enter your username"
          class="mb-4 w-full border p-2"
          name="username"
        />
        <button type="submit" class="bg-blue-500 p-2 text-white">
          Sign In
        </button>
      </form>
    </div>
  );
}

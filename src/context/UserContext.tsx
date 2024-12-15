import { createEffect, createSignal } from "solid-js";

const [username, setUsername] = createSignal<string | null>(null);

createEffect(() => {
  const storedUsername = localStorage.getItem("username");
  if (storedUsername) {
    setUsername(storedUsername);
  }
});

const login = (username: string) => {
  setUsername(username);
  localStorage.setItem("username", username);
};

const logout = () => {
  setUsername(null);
  localStorage.removeItem("username");
};

export const useUser = () => ({ username, login, logout });

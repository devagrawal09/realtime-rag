import { cache, action } from "@solidjs/router";
import { getCookie, setCookie, deleteCookie } from "vinxi/http";

export const getUserId = cache(async () => {
  "use server";

  const userId = getCookie(`userId`);

  return userId;
}, `user`);

export const login = action(async (formData: FormData) => {
  "use server";

  const userId = formData.get("userId") as string;
  setCookie(`userId`, userId);

  return userId;
}, `login`);

export const logout = action(async () => {
  "use server";

  deleteCookie(`userId`);
}, `logout`);

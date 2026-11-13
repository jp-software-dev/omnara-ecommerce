"use server";

import { isPasswordLeaked } from "@/lib/pwned";

/** Server action used by the sign-up and password-reset forms. */
export async function checkPasswordLeaked(password: string): Promise<boolean> {
  if (typeof password !== "string" || password.length < 8 || password.length > 200) return false;
  return isPasswordLeaked(password);
}

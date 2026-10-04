"use server";

import { createSession, destroySession, verifyCredentials } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!verifyCredentials(email, password)) {
    return { ok: false, error: "Invalid email or password" };
  }

  await createSession();
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

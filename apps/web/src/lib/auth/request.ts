/** Calls one of the `/api/auth/*` routes and surfaces its error message. */
export async function authRequest(
  path: "login" | "signup" | "logout",
  body?: unknown,
): Promise<{ error: string | null }> {
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.ok) return { error: null };

    const data = await response.json().catch(() => null);
    return { error: data?.error ?? "Something went wrong. Please try again." };
  } catch {
    return { error: "Network error. Please check your connection." };
  }
}

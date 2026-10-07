import type { z } from "zod";

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Reads a JSON request body and validates it against a zod schema. */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.output<S>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Request body must be valid JSON" };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  return { ok: true, data: result.data };
}

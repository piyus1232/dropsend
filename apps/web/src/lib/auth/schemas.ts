import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email" }));

// Supabase rejects passwords over 72 characters (bcrypt limit).
const password = z
  .string()
  .min(6, { error: "Password must be at least 6 characters" })
  .max(72, { error: "Password must be at most 72 characters" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Password is required" }),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(100, { error: "Name must be at most 100 characters" }),
  email,
  password,
});

export type LoginInput = z.input<typeof loginSchema>;
export type SignupInput = z.input<typeof signupSchema>;

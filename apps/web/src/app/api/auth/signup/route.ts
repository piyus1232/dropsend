import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/auth/schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, signupSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status ?? 400 },
    );
  }

  return NextResponse.json(
    {
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata.full_name,
      },
    },
    { status: 201 },
  );
}

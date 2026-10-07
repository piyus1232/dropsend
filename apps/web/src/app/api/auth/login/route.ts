import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, loginSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status ?? 400 },
    );
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata.full_name,
    },
  });
}

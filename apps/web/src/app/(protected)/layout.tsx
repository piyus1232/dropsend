import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  // The proxy already redirects logged-out users; this is a server-side
  // safety net in case the proxy matcher ever misses a route.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const name = data.claims.user_metadata?.full_name as string | undefined;

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="font-semibold text-foreground">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-3">
            {name && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {name}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

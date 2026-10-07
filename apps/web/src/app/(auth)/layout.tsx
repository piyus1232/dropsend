import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <Link
          href="/"
          className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
        >
          {APP_NAME}
        </Link>
        <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

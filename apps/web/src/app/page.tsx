import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="flex max-w-lg flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {APP_NAME}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          {APP_TAGLINE}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          {APP_DESCRIPTION}
        </p>
        <Button type="button" size="lg" disabled>
          Coming soon
        </Button>
      </main>
    </div>
  );
}

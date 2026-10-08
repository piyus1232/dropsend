import { Inngest } from "inngest";

// Local dev: set INNGEST_DEV=1 and run `bun run dev:inngest`.
// Production: set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY.
export const inngest = new Inngest({ id: "dropsend" });

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

// Called by Inngest (not users) to run functions; requests are verified with
// INNGEST_SIGNING_KEY in production, so this route is public in the proxy.
export const { GET, POST, PUT } = serve({ client: inngest, functions });

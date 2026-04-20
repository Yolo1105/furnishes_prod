/**
 * Inngest webhook + function registry endpoint.
 *
 * Inngest's cloud calls this URL to:
 *   - Discover registered functions (GET request on first sync)
 *   - Trigger functions when their events fire (POST per execution)
 *   - Verify ownership via signing key
 *
 * The serve() helper handles all of this — we just register the functions.
 */

import { serve } from "inngest/next";
import { inngest, inngestFunctions } from "@/lib/jobs/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

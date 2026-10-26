import { existsSync } from "node:fs";
import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";
import { gateway } from "ai";

// e2e loads no .env file itself.
const envFile = new URL(".env.local", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

// A secret or password under 6 characters fails config load, so only set ones are registered.
const secrets: Record<string, string> = {};
if (process.env.CLERK_SECRET_KEY) secrets["clerk-secret-key"] = process.env.CLERK_SECRET_KEY;

// The test user the agent signs in as. The tests create it through Clerk's Backend API if it's missing.
const credentials: Record<string, { username: string; password: string }> = {};
if (process.env.CLERK_TEST_PASSWORD) {
  credentials.ada = { username: "ada+clerk_test@example.com", password: process.env.CLERK_TEST_PASSWORD };
}

export default {
  // The Vercel AI Gateway serves the model id and reads AI_GATEWAY_API_KEY, or the OIDC token of a linked Vercel project.
  agents: {
    default: {
      model: gateway("openai/gpt-6-luna-fast"),
      system: "You are a thorough QA agent. Verify every outcome.",
      context:
        "Sign-in and sign-up happen on Clerk's hosted Account Portal, a page on accounts.dev that our app redirects to. The Clerk app is a development instance in test mode: addresses with +clerk_test get no email, and every verification code is 424242. After a correct password, Clerk asks for a code when the browser is new to it.",
    },
  },
  secrets,
  credentials,
  targets: [
    {
      engine: web(),
      app: {
        url: process.env.APP_URL ?? "http://localhost:3000",
        // Or let the runner start the dev server (and reuse one already running on that URL):
        // command: { executable: "npm", args: ["run", "dev"], reuseExisting: true, log: ".e2e/logs/app.log" },
      },
    },
  ],
} satisfies E2EConfig;

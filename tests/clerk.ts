import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { Browser } from "@e2e-dev/web";
import { credentials, expect, type TestFixtures } from "e2e";

// Test mode accepts this code for every +clerk_test address.
export const TEST_CODE = "424242";

// Clerk's hosted sign-in page in a development instance: https://<slug>.accounts.dev/sign-in
export const CLERK_SIGN_IN = /^https:\/\/[a-z0-9-]+\.accounts\.dev\/sign-in/;

export function createClerk(secretKey: string): ClerkClient {
  return createClerkClient({ secretKey });
}

export type TestUser = { id: string; email: string };

// The user the agent signs in as, created with the configured password the first time a test needs it.
export async function ensureTestUser(clerk: ClerkClient): Promise<TestUser> {
  const email = credentials.user("ada").username;
  const find = async () => (await clerk.users.getUserList({ emailAddress: [email] })).data[0];

  let user = await find();
  if (!user) {
    try {
      user = await clerk.users.createUser({ emailAddress: [email], password: process.env.CLERK_TEST_PASSWORD });
    } catch (error) {
      // A test running beside this one may have created it first.
      user = await find();
      if (!user) throw error;
    }
  }
  return { id: user.id, email };
}

type SignInFixtures = Pick<TestFixtures, "app" | "screen" | "agent"> & { browser: Browser };

// Signs in as the test user on Clerk's page, with the password as a secret handle the model never sees.
export async function signInWithPassword({ app, screen, agent, browser }: SignInFixtures): Promise<void> {
  const ada = credentials.user("ada");

  await app.open("/");
  await screen.getByRole("button", "Sign in").click();
  await expect(browser).toHaveURL(CLERK_SIGN_IN, { timeout: 15_000 });
  // Clerk's page renders in the browser, after a few redirects of its own.
  await agent.waitFor("Clerk's sign-in form shows an email address field", { interval: 500 });

  await agent.act(
    "sign in with email {email} and password {password}, then enter the verification code {code} if Clerk asks for one",
    { params: { email: ada.username, password: ada.password, code: TEST_CODE } },
  );
  await expect(browser).toHaveURL("/account", { timeout: 30_000 });
}

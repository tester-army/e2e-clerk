import { randomBytes } from "node:crypto";

import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { Browser } from "@e2e-dev/web";
import { credentials, expect, type Screen, type TestFixtures } from "e2e";

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

// A fresh test address, different on every run.
export function uniqueTestEmail(name: string): string {
  return `${name}-${Date.now().toString(36)}${randomBytes(2).toString("hex")}+clerk_test@example.com`;
}

export function randomPassword(): string {
  return randomBytes(18).toString("base64url");
}

// How many more failed sign-ins Clerk allows before it locks the user out.
export async function attemptsLeft(clerk: ClerkClient, userId: string): Promise<number | null | undefined> {
  return (await clerk.users.getUser(userId)).raw?.verification_attempts_remaining;
}

// The session /account shows, as Clerk's Backend API sees it.
export async function sessionOnAccountPage(screen: Screen, clerk: ClerkClient) {
  return clerk.sessions.getSession((await screen.getByTestId("account-session-id").textContent()) ?? "");
}

type PageFixtures = Pick<TestFixtures, "app" | "screen" | "agent"> & { browser: Browser };

// Clicks our Sign in button and waits for Clerk's sign-in form.
export async function openClerkSignIn({ app, screen, agent, browser }: PageFixtures): Promise<void> {
  await app.open("/");
  await screen.getByRole("button", "Sign in").click();
  await expect(browser).toHaveURL(CLERK_SIGN_IN, { timeout: 15_000 });
  // Clerk's page renders in the browser, after a few redirects of its own.
  await agent.waitFor("Clerk's sign-in form shows an email address field", { interval: 500 });
}

// Signs in as the test user on Clerk's page, with the password as a secret handle the model never sees.
export async function signInWithPassword(fixtures: PageFixtures): Promise<void> {
  const { agent, browser } = fixtures;
  const ada = credentials.user("ada");

  await openClerkSignIn(fixtures);
  await agent.act(
    "sign in with email {email} and password {password}, then enter the verification code {code} if Clerk asks for one",
    { params: { email: ada.username, password: ada.password, code: TEST_CODE } },
  );
  await expect(browser).toHaveURL("/account", { timeout: 30_000 });
}

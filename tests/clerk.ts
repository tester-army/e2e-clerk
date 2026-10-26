import { randomBytes } from "node:crypto";

import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { Browser } from "@e2e-dev/web";
import { credentials, expect, type Screen, type TestFixtures } from "e2e";

export const TEST_CODE = "424242";

export const CLERK_SIGN_IN = /^https:\/\/[a-z0-9-]+\.accounts\.dev\/sign-in/;
export const CLERK_SIGN_UP = /^https:\/\/[a-z0-9-]+\.accounts\.dev\/sign-up/;

export function createClerk(secretKey: string): ClerkClient {
  return createClerkClient({ secretKey });
}

export type TestUser = { id: string; email: string };

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

export function uniqueTestEmail(name: string): string {
  return `${name}-${Date.now().toString(36)}${randomBytes(2).toString("hex")}+clerk_test@example.com`;
}

export function randomPassword(): string {
  return randomBytes(18).toString("base64url");
}

export async function attemptsLeft(clerk: ClerkClient, userId: string): Promise<number | null | undefined> {
  return (await clerk.users.getUser(userId)).raw?.verification_attempts_remaining;
}

// pk_test_<base64 of "<frontend api host>$">
function frontendApiHost(): string {
  const encoded = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.split("_")[2] ?? "";
  return Buffer.from(encoded, "base64").toString().replace(/\$$/, "");
}

// Lets sign-ups past Clerk's bot protection, as @clerk/testing's setupClerkTestingToken does.
export async function addTestingToken(browser: Browser, clerk: ClerkClient): Promise<void> {
  const { token } = await clerk.testingTokens.createTestingToken();
  const frontendApi = new RegExp(`^https://${frontendApiHost().replaceAll(".", "\\.")}/v1/`);
  await browser.route(frontendApi, async (route) => {
    const url = new URL(route.request.url);
    url.searchParams.set("__clerk_testing_token", token);
    await route.continue({ url: url.toString() });
  });
}

export async function sessionOnAccountPage(screen: Screen, clerk: ClerkClient) {
  return clerk.sessions.getSession((await screen.getByTestId("account-session-id").textContent()) ?? "");
}

type PageFixtures = Pick<TestFixtures, "app" | "screen" | "agent"> & { browser: Browser };

export async function openClerkSignIn({ app, screen, agent, browser }: PageFixtures): Promise<void> {
  await app.open("/");
  await screen.getByRole("button", "Sign in").click();
  await expect(browser).toHaveURL(CLERK_SIGN_IN, { timeout: 15_000 });
  // Clerk's page renders after a few redirects of its own.
  await agent.waitFor("Clerk's sign-in form shows an email address field", { interval: 500 });
}

// Clerk refuses a code typed before it has sent one, which a replayed step can do.
export function codeSent(browser: Browser) {
  return browser.waitForResponse(
    /\/v1\/client\/sign_(?:ins|ups)\/[^/]+\/prepare_(?:first_factor|second_factor|verification)/,
    { timeout: 60_000 },
  );
}

// The browser is new to Clerk, so Device Trust asks for an email code after the password.
export async function signInWithPassword(fixtures: PageFixtures): Promise<void> {
  const { agent, browser } = fixtures;
  const ada = credentials.user("ada");

  await openClerkSignIn(fixtures);
  const sent = codeSent(browser);
  await agent.act(
    "enter the email {email} and continue, then enter the password {password} and continue. Stop when Clerk asks for a verification code.",
    { params: { email: ada.username, password: ada.password } },
  );
  await sent;
  await agent.act("enter the verification code {code}", { params: { code: TEST_CODE } });
  await expect(browser).toHaveURL("/account", { timeout: 30_000 });
}

import { describe } from "@e2e-dev/web";
import { expect, unique } from "e2e";

import {
  addTestingToken,
  attemptsLeft,
  CLERK_SIGN_IN,
  CLERK_SIGN_UP,
  openClerkSignIn,
  randomPassword,
  sessionOnAccountPage,
  TEST_CODE,
} from "./clerk";
import { newUserTest, skip, test } from "./fixtures";

const GOOGLE_SIGN_IN = /^https:\/\/accounts\.google\.com\//;

// Clerk's page isn't built for automation, so these tests retry.
describe("Clerk sign-in", { skip, retries: 2, timeout: 120_000 }, () => {
  test(
    "the account page opens already signed in",
    { session: "ada" },
    async ({ app, screen, browser, clerk, testUser }) => {
      await app.open("/account");

      await expect(browser).toHaveURL("/account");
      await expect(screen.getByTestId("account-email")).toHaveText(testUser.email);
      await expect(screen.getByTestId("account-user-id")).toHaveText(testUser.id);
      expect(await sessionOnAccountPage(screen, clerk)).toMatchObject({ status: "active", userId: testUser.id });
    },
  );

  newUserTest(
    "a wrong password shows Clerk's error, and Clerk counts the failed attempt",
    { agentContext: "The password is wrong on purpose, so Clerk's error is the expected outcome, not a failure." },
    async ({ app, screen, agent, browser, clerk, newUsers }) => {
      // Its own user, so failed attempts never lock ada out.
      const user = await newUsers.create("wrong-password");
      const attemptsBefore = await attemptsLeft(clerk, user.id);
      await openClerkSignIn({ app, screen, agent, browser });

      await agent.act("enter the email {email} and continue, then enter the password {password} and continue", {
        params: { email: user.email, password: "not-the-right-password" },
      });
      await agent.waitFor("Clerk says the password is incorrect", { vision: true });

      await expect(browser).toHaveURL(CLERK_SIGN_IN);
      expect(await attemptsLeft(clerk, user.id)).toBe((attemptsBefore ?? 0) - 1);
    },
  );

  test(
    "signs in with an email code instead of a password",
    { agentContext: "Use Clerk's option to get a code by email instead of typing a password." },
    async ({ app, screen, agent, browser, clerk, testUser }) => {
      await openClerkSignIn({ app, screen, agent, browser });

      await agent.act("sign in as {email} with a verification code sent by email, and enter the code {code}", {
        params: { email: testUser.email, code: TEST_CODE },
      });

      await expect(browser).toHaveURL("/account", { timeout: 30_000 });
      await expect(screen.getByTestId("account-email")).toHaveText(testUser.email);
      expect(await sessionOnAccountPage(screen, clerk)).toMatchObject({ status: "active", userId: testUser.id });
    },
  );

  test(
    "Continue with Google hands off to Google's sign-in page",
    {
      agentContext: "Only start Google sign-in. Never sign in to Google: Google's sign-in page is where the test ends.",
    },
    async ({ app, screen, agent, browser }) => {
      await openClerkSignIn({ app, screen, agent, browser });

      await agent.act("click Continue with Google");

      await expect(browser).toHaveURL(GOOGLE_SIGN_IN, { timeout: 15_000 });
      const redirectUri = new URL(await browser.url()).searchParams.get("redirect_uri") ?? "";
      expect(URL.canParse(redirectUri) && new URL(redirectUri).pathname).toBe("/v1/oauth_callback");
    },
  );

  newUserTest(
    "signs up a new +clerk_test address with the test code",
    async ({ app, screen, agent, browser, clerk, newUsers }) => {
      const email = newUsers.email("sign-up");
      await addTestingToken(browser, clerk);
      await app.open("/");
      await screen.getByRole("button", "Create account").click();
      await expect(browser).toHaveURL(CLERK_SIGN_UP, { timeout: 15_000 });
      await agent.waitFor("Clerk's sign-up form shows email address and password fields", { interval: 500 });

      await agent.act("sign up with email {email} and password {password}, then enter the verification code {code}", {
        params: { email: unique(email), password: unique(randomPassword()), code: TEST_CODE },
      });

      await expect(browser).toHaveURL("/account", { timeout: 30_000 });
      await expect(screen.getByTestId("account-email")).toHaveText(email);
      const { data: users } = await clerk.users.getUserList({ emailAddress: [email] });
      expect(users).toHaveLength(1);
      expect(users[0].passwordEnabled).toBe(true);
      expect(users[0].primaryEmailAddress?.verification?.status).toBe("verified");
    },
  );
});

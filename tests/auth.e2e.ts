import { describe } from "@e2e-dev/web";
import { expect } from "e2e";

import { attemptsLeft, CLERK_SIGN_IN, openClerkSignIn, sessionOnAccountPage } from "./clerk";
import { newUserTest, skip, test } from "./fixtures";

// Clerk's page isn't ours and isn't built for automation, so these tests retry.
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
      // A user of its own, so failed attempts never lock out the test user.
      const user = await newUsers.create("wrong-password");
      const attemptsBefore = await attemptsLeft(clerk, user.id);
      await openClerkSignIn({ app, screen, agent, browser });

      // Not a secret: the wrong password may be seen, and screenshots stay on for the check below.
      await agent.act("enter the email {email} and continue, then enter the password {password} and continue", {
        params: { email: user.email, password: "not-the-right-password" },
      });
      await agent.waitFor("Clerk says the password is incorrect", { vision: true });

      await expect(browser).toHaveURL(CLERK_SIGN_IN);
      expect(await attemptsLeft(clerk, user.id)).toBe((attemptsBefore ?? 0) - 1);
    },
  );
});

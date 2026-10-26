import { expect } from "e2e";

import { signInWithPassword } from "./clerk";
import { test } from "./fixtures";

// Signing out ends the Clerk session everywhere, so the sign-out test gets its own.
const SETUPS = [
  { title: "signs in with a password on Clerk's page", session: "ada" },
  { title: "signs in again for the sign-out test", session: "ada-sign-out" },
];

for (const { title, session: name } of SETUPS) {
  test.setup(
    title,
    { sessions: [name], retries: 2, timeout: 120_000 },
    async ({ app, screen, agent, browser, session, testUser }) => {
      await signInWithPassword({ app, screen, agent, browser });
      await expect(screen.getByTestId("account-email")).toHaveText(testUser.email);

      await session.save(name);
    },
  );
}

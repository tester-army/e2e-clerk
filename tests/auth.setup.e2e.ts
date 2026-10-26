import { expect } from "e2e";

import { signInWithPassword } from "./clerk";
import { test } from "./fixtures";

// Clerk's page isn't ours and isn't built for automation, so the sign-in retries.
test.setup(
  "signs in with a password on Clerk's page",
  { sessions: ["ada"], retries: 2, timeout: 120_000 },
  async ({ app, screen, agent, browser, session, testUser }) => {
    await signInWithPassword({ app, screen, agent, browser });
    await expect(screen.getByTestId("account-email")).toHaveText(testUser.email);

    await session.save("ada");
  },
);

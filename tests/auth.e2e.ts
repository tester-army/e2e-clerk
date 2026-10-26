import { describe } from "@e2e-dev/web";
import { expect } from "e2e";

import { skip, test } from "./fixtures";

describe("Clerk sign-in", { skip }, () => {
  test(
    "the account page opens already signed in",
    { session: "ada" },
    async ({ app, screen, browser, clerk, testUser }) => {
      await app.open("/account");

      await expect(browser).toHaveURL("/account");
      await expect(screen.getByTestId("account-email")).toHaveText(testUser.email);
      await expect(screen.getByTestId("account-user-id")).toHaveText(testUser.id);

      const sessionId = (await screen.getByTestId("account-session-id").textContent()) ?? "";
      expect(await clerk.sessions.getSession(sessionId)).toMatchObject({ status: "active", userId: testUser.id });
    },
  );
});

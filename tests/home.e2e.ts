import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("the home page offers to sign in or create an account", async ({ app, screen }) => {
  await app.open("/");

  await expect(screen.getByRole("heading", "Sign in")).toBeVisible();
  await expect(screen.getByRole("button", "Sign in")).toBeVisible();
  await expect(screen.getByRole("button", "Create account")).toBeVisible();
});

import type { ClerkClient } from "@clerk/backend";
import { test as base } from "@e2e-dev/web";

import { createClerk, ensureTestUser, randomPassword, uniqueTestEmail, type TestUser } from "./clerk";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secretKey = process.env.CLERK_SECRET_KEY;
// The tests create and delete users, so a production key (no _test_) fails instead of skipping.
if ([publishableKey, secretKey].some((key) => key && !key.includes("_test_"))) {
  throw new Error("The e2e tests only run against a Clerk development instance (pk_test_ and sk_test_ keys).");
}

export const skip =
  !publishableKey || !secretKey
    ? "set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to run the Clerk tests"
    : !process.env.CLERK_TEST_PASSWORD
      ? "set CLERK_TEST_PASSWORD to run the Clerk tests"
      : !process.env.AI_GATEWAY_API_KEY
        ? "set AI_GATEWAY_API_KEY to run the agent tests"
        : false;

const withClerk = base.extend<{ clerk: ClerkClient }>({
  clerk: async ({}, use) => {
    await use(createClerk(secretKey ?? ""));
  },
});

export const test = withClerk.extend<{ testUser: TestUser }>({
  testUser: async ({ clerk }, use) => {
    await use(await ensureTestUser(clerk));
  },
});

type NewUsers = {
  email(name: string): string;
  create(name: string): Promise<TestUser>;
};

// Users a test creates are deleted after it, after a failure too.
export const newUserTest = withClerk.extend<{ newUsers: NewUsers }>({
  newUsers: async ({ clerk }, use) => {
    const emails: string[] = [];
    const email = (name: string) => {
      const address = uniqueTestEmail(name);
      emails.push(address);
      return address;
    };

    await use({
      email,
      create: async (name) => {
        const address = email(name);
        const user = await clerk.users.createUser({ emailAddress: [address], password: randomPassword() });
        return { id: user.id, email: address };
      },
    });

    for (const address of emails) {
      const { data } = await clerk.users.getUserList({ emailAddress: [address] });
      await Promise.all(data.map((user) => clerk.users.deleteUser(user.id)));
    }
  },
});

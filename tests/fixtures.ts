import type { ClerkClient } from "@clerk/backend";
import { test as base } from "@e2e-dev/web";

import { createClerk, ensureTestUser, randomPassword, uniqueTestEmail, type TestUser } from "./clerk";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secretKey = process.env.CLERK_SECRET_KEY;
// Development keys contain _test_. The tests create and delete users, so a production key fails loudly instead of skipping.
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

// Tests that sign in as the test user.
export const test = withClerk.extend<{ testUser: TestUser }>({
  testUser: async ({ clerk }, use) => {
    await use(await ensureTestUser(clerk));
  },
});

type NewUsers = {
  /** A fresh test address. Any user Clerk has with it is deleted after the test. */
  email(name: string): string;
  /** A user with a random password, created through the Backend API and deleted after the test. */
  create(name: string): Promise<TestUser>;
};

// Tests that create users of their own. Each one is deleted afterwards, after a failure too.
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

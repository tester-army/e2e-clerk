import { SignOutButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

import { AccountPanel } from "@/app/account/account-panel";
import { LightButton } from "@/components/ui/light-button";
import { OUTLINE_BUTTON } from "@/components/ui/outline-button";

export default async function AccountPage() {
  const { userId, sessionId } = await auth.protect();
  const user = await currentUser();

  return (
    <AccountPanel title={user?.primaryEmailAddress?.emailAddress ?? "Signed in"} titleTestId="account-email">
      <dl className="flex flex-col gap-3 type-code-s">
        <div className="flex flex-col gap-1">
          <dt className="text-e2e-text-faint">User ID</dt>
          <dd data-testid="account-user-id" className="wrap-anywhere text-e2e-text-soft">
            {userId}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-e2e-text-faint">Session ID</dt>
          <dd data-testid="account-session-id" className="wrap-anywhere text-e2e-text-soft">
            {sessionId}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-3">
        <SignOutButton redirectUrl="/">
          <LightButton>Sign out</LightButton>
        </SignOutButton>
        <Link href="/" className={OUTLINE_BUTTON}>
          Back to home
        </Link>
      </div>
    </AccountPanel>
  );
}

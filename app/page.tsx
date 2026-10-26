import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Suspense } from "react";

import { LIGHT_BUTTON, LightButton } from "@/components/ui/light-button";
import { OutlineButton } from "@/components/ui/outline-button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-100 flex-col gap-6">
        <section aria-labelledby="home-heading" className="border border-e2e-hairline-strong bg-e2e-panel">
          <div className="flex flex-col gap-8 p-6 sm:p-8">
            <Suspense fallback={<Intro title="Sign in" text="Checking your session with Clerk…" />}>
              <SessionActions />
            </Suspense>
          </div>
          <div className="flex flex-col gap-3 border-t border-e2e-hairline-strong px-6 py-4 sm:px-8">
            <h2 className="type-label-xs text-e2e-text-faint">Test mode</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 type-code-s">
              <dt className="text-e2e-text-faint">Email</dt>
              <dd className="text-e2e-text-soft">you+clerk_test@example.com</dd>
              <dt className="text-e2e-text-faint">Code</dt>
              <dd className="text-e2e-text-soft">424242</dd>
            </dl>
          </div>
        </section>
        <p className="text-center type-caption text-e2e-text-faint">
          Both buttons lead to accounts.dev, Clerk&apos;s hosted page.
        </p>
      </div>
    </main>
  );
}

async function SessionActions() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    return (
      <>
        <Intro title="Sign in" text="Use a password, an email code, or Google." />
        <div className="flex flex-col gap-3">
          <SignInButton forceRedirectUrl="/account" signUpForceRedirectUrl="/account">
            <LightButton>Sign in</LightButton>
          </SignInButton>
          <SignUpButton forceRedirectUrl="/account" signInForceRedirectUrl="/account">
            <OutlineButton>Create account</OutlineButton>
          </SignUpButton>
        </div>
      </>
    );
  }

  const user = await currentUser();
  return (
    <>
      <Intro title="Signed in" text={`As ${user?.primaryEmailAddress?.emailAddress ?? "you"}.`} />
      <Link href="/account" className={LIGHT_BUTTON}>
        Open account
      </Link>
    </>
  );
}

function Intro({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="type-label-xs text-e2e-text-faint">Clerk sign-in, tested end to end</p>
      <h1 id="home-heading" className="type-h2 text-e2e-text-bright">
        {title}
      </h1>
      <p className="type-body-s text-e2e-text-soft">{text}</p>
    </div>
  );
}

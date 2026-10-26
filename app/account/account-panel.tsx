import type { ReactNode } from "react";

export function AccountPanel({
  title,
  titleTestId,
  children,
}: {
  title: string;
  titleTestId?: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <section
        aria-labelledby="account-heading"
        className="flex w-full max-w-100 flex-col gap-8 border border-e2e-hairline-strong bg-e2e-panel p-6 sm:p-8"
      >
        <div className="flex flex-col gap-3">
          <p className="type-label-xs text-e2e-text-faint">Account, read from Clerk on the server</p>
          <h1
            id="account-heading"
            data-testid={titleTestId}
            className="type-h3-display wrap-anywhere text-e2e-text-bright"
          >
            {title}
          </h1>
        </div>
        {children}
      </section>
    </main>
  );
}

import { AccountPanel } from "@/app/account/account-panel";

export default function AccountLoading() {
  return (
    <AccountPanel title="Asking Clerk who you are…">
      <p className="type-body-s text-e2e-text-soft">One moment.</p>
    </AccountPanel>
  );
}

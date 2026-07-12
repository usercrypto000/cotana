"use client";

import { useLogout, usePrivy } from "@privy-io/react-auth";
import { Button } from "@cotana/ui";
import { useStoreAuthEnabled } from "./store-privy-provider";

function EnabledAuthControls() {
  const { authenticated, login, ready } = usePrivy();
  const { logout } = useLogout();

  if (!ready) {
    return (
      <Button variant="secondary" className="h-8" disabled>
        Loading
      </Button>
    );
  }

  if (authenticated) {
    return (
      <Button variant="secondary" className="h-8" onClick={() => void logout()}>
        Sign out
      </Button>
    );
  }

  return <Button className="h-8" onClick={() => void login()}>Sign in</Button>;
}

export function StoreAuthControls() {
  const authEnabled = useStoreAuthEnabled();

  if (!authEnabled) {
    return (
      <Button variant="outline" className="h-8" disabled title="Authentication is not configured for this environment">
        Sign in
      </Button>
    );
  }

  return <EnabledAuthControls />;
}

"use client";

import { useLogout, usePrivy } from "@privy-io/react-auth";
import { Button } from "@cotana/ui";
import { useStoreAuthEnabled } from "./store-privy-provider";

function EnabledAuthControls() {
  const { authenticated, login, ready } = usePrivy();
  const { logout } = useLogout();

  if (!ready) {
    return (
      <Button variant="secondary" disabled>
        Loading
      </Button>
    );
  }

  if (authenticated) {
    return (
      <Button variant="secondary" onClick={() => void logout()}>
        Sign out
      </Button>
    );
  }

  return <Button onClick={() => void login()}>Sign in</Button>;
}

export function StoreAuthControls() {
  const authEnabled = useStoreAuthEnabled();

  if (!authEnabled) {
    return (
      <Button variant="secondary" disabled>
        Auth not configured
      </Button>
    );
  }

  return <EnabledAuthControls />;
}

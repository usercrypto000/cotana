"use client";

import { createContext, startTransition, useContext, useEffect, useRef } from "react";
import { PrivyProvider, useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

const AuthEnabledContext = createContext(false);

function SessionBridge() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();
  const { identityToken } = useIdentityToken();
  const syncedToken = useRef<string | null>(null);
  const hadAuthenticatedSession = useRef(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (authenticated && identityToken && identityToken !== syncedToken.current) {
      syncedToken.current = identityToken;
      hadAuthenticatedSession.current = true;

      void fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ identityToken })
      }).then(() => {
        startTransition(() => router.refresh());
      });

      return;
    }

    if (!authenticated && hadAuthenticatedSession.current) {
      hadAuthenticatedSession.current = false;
      syncedToken.current = null;

      void fetch("/api/auth/logout", {
        method: "POST"
      }).then(() => {
        startTransition(() => router.refresh());
      });
    }
  }, [authenticated, identityToken, ready, router]);

  return null;
}

export function StorePrivyProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
  const authEnabled = Boolean(appId);

  if (!authEnabled || !appId) {
    return <AuthEnabledContext.Provider value={false}>{children}</AuthEnabledContext.Provider>;
  }

  return (
    <AuthEnabledContext.Provider value={true}>
      <PrivyProvider
        appId={appId}
        clientId={clientId}
        config={{
          loginMethods: ["email", "google", "apple", "passkey"],
          appearance: {
            theme: "light",
            landingHeader: "Sign in to Cotana",
            loginMessage: "Use email, Google, Apple, or a passkey. No wallet steps are shown.",
            walletChainType: "ethereum-only"
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: "off"
            },
            solana: {
              createOnLogin: "off"
            },
            showWalletUIs: false
          }
        }}
      >
        <SessionBridge />
        {children}
      </PrivyProvider>
    </AuthEnabledContext.Provider>
  );
}

export function useStoreAuthEnabled() {
  return useContext(AuthEnabledContext);
}

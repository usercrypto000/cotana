"use client";

import { Card, CardContent, CardHeader, CardTitle, Button } from "@cotana/ui";
import { usePrivy } from "@privy-io/react-auth";
import { useAdminAuthEnabled } from "./admin-privy-provider";

function EnabledGate() {
  const { login, ready } = usePrivy();

  return (
    <Card className="max-w-xl bg-slate-900 text-white">
      <CardHeader>
        <CardTitle className="text-white">Admin access required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300">
          Sign in with an allowlisted email or a user account that already has the ADMIN role in the database.
        </p>
        <Button onClick={() => void login()} disabled={!ready}>
          {ready ? "Sign in" : "Loading"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function AdminAuthGate() {
  const authEnabled = useAdminAuthEnabled();

  if (!authEnabled) {
    return (
      <Card className="max-w-xl bg-slate-900 text-white">
        <CardHeader>
          <CardTitle className="text-white">Privy not configured</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Set your Privy environment variables before using the admin dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <EnabledGate />;
}

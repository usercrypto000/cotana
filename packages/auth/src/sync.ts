import { logServerError, requirePrivyServerEnv } from "@cotana/config/runtime";
import { UserRole, prisma } from "@cotana/db";
import { type LinkedAccount, type User as PrivyUser, verifyIdentityToken } from "@privy-io/node";
import { isAllowedAdminEmail } from "./allowlist";
import type { SessionUser } from "./types";

function getPrivyAppId() {
  const env = requirePrivyServerEnv();
  return env.PRIVY_APP_ID ?? env.NEXT_PUBLIC_PRIVY_APP_ID ?? null;
}

function getPrivyVerificationKey() {
  return requirePrivyServerEnv().PRIVY_VERIFICATION_KEY ?? null;
}

function sanitizeIdentityToken(identityToken: string) {
  return identityToken.replace(/^Bearer\s+/i, "").trim();
}

function getEmail(linkedAccounts: LinkedAccount[]) {
  for (const account of linkedAccounts) {
    if (account.type === "email") {
      return account.address;
    }

    if ("email" in account && typeof account.email === "string" && account.email.length > 0) {
      return account.email;
    }
  }

  return null;
}

function titleCase(input: string) {
  return input
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getDisplayName(linkedAccounts: LinkedAccount[], email: string | null) {
  for (const account of linkedAccounts) {
    if ("display_name" in account && typeof account.display_name === "string" && account.display_name.length > 0) {
      return account.display_name;
    }

    if ("name" in account && typeof account.name === "string" && account.name.length > 0) {
      return account.name;
    }

    if ("username" in account && typeof account.username === "string" && account.username.length > 0) {
      return account.username;
    }

    if ("first_name" in account && typeof account.first_name === "string" && account.first_name.length > 0) {
      return account.first_name;
    }
  }

  if (email) {
    return titleCase(email.split("@")[0] ?? "Cotana User");
  }

  return "Cotana User";
}

function getAvatarUrl(linkedAccounts: LinkedAccount[], displayName: string, email: string | null) {
  for (const account of linkedAccounts) {
    if ("profile_picture_url" in account && typeof account.profile_picture_url === "string" && account.profile_picture_url) {
      return account.profile_picture_url;
    }

    if ("profile_picture" in account && typeof account.profile_picture === "string" && account.profile_picture) {
      return account.profile_picture;
    }

    if ("photo_url" in account && typeof account.photo_url === "string" && account.photo_url) {
      return account.photo_url;
    }
  }

  const seed = encodeURIComponent(email ?? displayName);
  return `https://api.dicebear.com/9.x/glass/svg?seed=${seed}`;
}

function getRole(existingRole: UserRole | undefined, email: string | null) {
  if (existingRole && existingRole !== UserRole.USER) {
    return existingRole;
  }

  return isAllowedAdminEmail(email) ? UserRole.ADMIN : UserRole.USER;
}

function toSessionUser(user: {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role
  };
}

export async function verifyPrivyIdentityToken(identityToken: string) {
  const appId = getPrivyAppId();
  const verificationKey = getPrivyVerificationKey();

  if (!appId || !verificationKey) {
    throw new Error("Privy server auth is not configured. Set PRIVY_APP_ID/NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_VERIFICATION_KEY.");
  }

  return verifyIdentityToken({
    identity_token: sanitizeIdentityToken(identityToken),
    app_id: appId,
    verification_key: verificationKey
  });
}

export async function syncPrivyUser(identityToken: string): Promise<{
  sessionUser: SessionUser;
  privyUser: PrivyUser;
  isNewUser: boolean;
}> {
  try {
    const privyUser = await verifyPrivyIdentityToken(identityToken);
    const email = getEmail(privyUser.linked_accounts);
    const displayName = getDisplayName(privyUser.linked_accounts, email);
    const avatarUrl = getAvatarUrl(privyUser.linked_accounts, displayName, email);
    const existingUser = await prisma.user.findUnique({
      where: { privyDid: privyUser.id },
      select: { id: true, role: true }
    });

    const user = await prisma.user.upsert({
      where: { privyDid: privyUser.id },
      update: {
        email,
        displayName,
        avatarUrl,
        role: getRole(existingUser?.role, email)
      },
      create: {
        privyDid: privyUser.id,
        email,
        displayName,
        avatarUrl,
        role: getRole(undefined, email),
        profile: {
          create: {
            profileCompleted: true
          }
        }
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true
      }
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        profileCompleted: Boolean(user.displayName && user.avatarUrl)
      },
      create: {
        userId: user.id,
        profileCompleted: Boolean(user.displayName && user.avatarUrl)
      }
    });

    return {
      sessionUser: toSessionUser(user),
      privyUser,
      isNewUser: !existingUser
    };
  } catch (error) {
    logServerError("Failed to sync Privy user.", error, {
      scope: "auth.sync"
    });
    throw error;
  }
}

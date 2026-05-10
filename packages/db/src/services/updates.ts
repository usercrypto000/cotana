import { AppUpdateType } from "@prisma/client";
import { prisma } from "../client";

export type AppUpdateInput = {
  versionLabel: string;
  title: string;
  body: string;
  publishedAt: Date;
  type?: AppUpdateType | null;
};

export async function listAppUpdates(appId: string) {
  return prisma.appUpdate.findMany({
    where: {
      appId
    },
    orderBy: {
      publishedAt: "desc"
    }
  });
}

export async function createAppUpdate(appId: string, input: AppUpdateInput) {
  return prisma.appUpdate.create({
    data: {
      appId,
      versionLabel: input.versionLabel.trim(),
      title: input.title.trim(),
      body: input.body.trim(),
      publishedAt: input.publishedAt,
      type: input.type ?? null
    }
  });
}

export async function updateAppUpdate(id: string, input: AppUpdateInput) {
  try {
    return await prisma.appUpdate.update({
      where: {
        id
      },
      data: {
        versionLabel: input.versionLabel.trim(),
        title: input.title.trim(),
        body: input.body.trim(),
        publishedAt: input.publishedAt,
        type: input.type ?? null
      }
    });
  } catch {
    return null;
  }
}

export async function deleteAppUpdate(id: string) {
  try {
    await prisma.appUpdate.delete({
      where: {
        id
      }
    });
    return true;
  } catch {
    return false;
  }
}

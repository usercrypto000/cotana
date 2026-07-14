import { appStatusValues } from "./app-status";
import {
  AppUpdateType
} from "@cotana/db";
import { EditorialShelfStatus, EditorialShelfVisibility } from "@cotana/db";
import { z } from "zod";

export const adminAppPayloadSchema = z.object({
  slug: z.string().optional().default(""),
  name: z.string().min(1, "Name is required."),
  shortDescription: z.string().min(1, "Short description is required."),
  longDescription: z.string().min(1, "Long description is required."),
  // TODO: HARDENED FOR VERCEL PRODUCTION DEPLOYMENT
  websiteUrl: z.string().url("Website URL must be valid.").transform((val) => {
    try {
      return new URL(val).toString();
    } catch {
      return val;
    }
  }),
  logoUrl: z.string().url("Logo URL must be valid."),
  verified: z.boolean().default(false),
  verifiedNote: z.string().optional().nullable().default(""),
  categoryId: z.string().min(1, "Category is required."),
  tags: z.array(z.string()).default([]),
  screenshots: z.array(z.string().url("Screenshot URL must be valid.")).default([]),
  status: z.enum(appStatusValues).optional()
});

export const publishActionSchema = z.object({
  action: z.enum(["publish", "unpublish", "archive"])
});

export const moderationActionSchema = z.object({
  reason: z.string().min(1).default("Removed by admin moderation.")
});

export const editorialShelfPayloadSchema = z.object({
  title: z.string().min(1, "Title is required."),
  slug: z.string().optional().default(""),
  description: z.string().min(1, "Description is required."),
  status: z.nativeEnum(EditorialShelfStatus).default(EditorialShelfStatus.DRAFT),
  sortOrder: z.coerce.number().int().min(0).default(0),
  visibility: z.nativeEnum(EditorialShelfVisibility).default(EditorialShelfVisibility.HOME),
  pinned: z.boolean().default(false),
  categoryId: z.string().nullable().optional(),
  appIds: z.array(z.string()).default([])
});

export const appUpdatePayloadSchema = z.object({
  versionLabel: z.string().min(1, "Version or label is required."),
  title: z.string().min(1, "Title is required."),
  body: z.string().min(1, "Body is required."),
  publishedAt: z.coerce.date(),
  type: z.nativeEnum(AppUpdateType).nullable().optional()
});

export const discoveryConfigPayloadSchema = z.object({
  key: z.enum([
    "discovery.weights.trending",
    "discovery.weights.rising",
    "discovery.weights.community_pick"
  ]),
  valueJson: z.record(z.string(), z.unknown())
});

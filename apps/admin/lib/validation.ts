import { appStatusValues } from "./app-status";
import { z } from "zod";

export const adminAppPayloadSchema = z.object({
  slug: z.string().optional().default(""),
  name: z.string().min(1, "Name is required."),
  shortDescription: z.string().min(1, "Short description is required."),
  longDescription: z.string().min(1, "Long description is required."),
  websiteUrl: z.string().url("Website URL must be valid."),
  logoUrl: z.string().url("Logo URL must be valid."),
  verified: z.boolean().default(false),
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

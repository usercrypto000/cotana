import { appStatusValues } from "./app-status";
import {
  AgentAuthType,
  AgentCapabilityStatus,
  AgentInteractionMode,
  AgentInterfaceType,
  AgentListingStatus,
  AppAudience,
  AppUpdateType
} from "@cotana/db";
import { EditorialShelfStatus, EditorialShelfVisibility } from "@cotana/db";
import { z } from "zod";

export const adminAppPayloadSchema = z.object({
  slug: z.string().optional().default(""),
  name: z.string().min(1, "Name is required."),
  shortDescription: z.string().min(1, "Short description is required."),
  longDescription: z.string().min(1, "Long description is required."),
  websiteUrl: z.string().url("Website URL must be valid."),
  logoUrl: z.string().url("Logo URL must be valid."),
  verified: z.boolean().default(false),
  verifiedNote: z.string().optional().nullable().default(""),
  agentAudience: z.nativeEnum(AppAudience).default(AppAudience.HUMAN),
  agentListingStatus: z.nativeEnum(AgentListingStatus).default(AgentListingStatus.NOT_APPLICABLE),
  agentSummary: z.string().optional().nullable().default(""),
  agentDocsUrl: z.string().url("Agent docs URL must be valid.").nullable().optional(),
  agentIntegrationNotes: z.string().optional().nullable().default(""),
  categoryId: z.string().min(1, "Category is required."),
  tags: z.array(z.string()).default([]),
  screenshots: z.array(z.string().url("Screenshot URL must be valid.")).default([]),
  agentCapabilities: z
    .array(
      z.object({
        name: z.string().min(1, "Capability name is required."),
        slug: z.string().optional().default(""),
        description: z.string().min(1, "Capability description is required."),
        capabilityType: z.string().min(1, "Capability type is required."),
        authType: z.nativeEnum(AgentAuthType).default(AgentAuthType.NONE),
        interfaceType: z.nativeEnum(AgentInterfaceType).default(AgentInterfaceType.HTTP_API),
        interactionMode: z.nativeEnum(AgentInteractionMode).default(AgentInteractionMode.READ_ONLY),
        endpointUrl: z.string().url("Endpoint URL must be valid.").nullable().optional(),
        docsUrl: z.string().url("Capability docs URL must be valid.").nullable().optional(),
        inputSchemaJson: z.unknown().nullable().optional(),
        outputSchemaJson: z.unknown().nullable().optional(),
        safetyNotes: z.string().nullable().optional(),
        status: z.nativeEnum(AgentCapabilityStatus).default(AgentCapabilityStatus.ACTIVE),
        reliabilityScore: z.coerce.number().min(0).max(1).nullable().optional(),
        latencyP50Ms: z.coerce.number().int().min(0).nullable().optional()
      }),
    )
    .default([]),
  status: z.enum(appStatusValues).optional()
}).superRefine((value, context) => {
  if (value.agentAudience === AppAudience.HUMAN && value.agentListingStatus !== AgentListingStatus.NOT_APPLICABLE) {
    context.addIssue({
      code: "custom",
      path: ["agentListingStatus"],
      message: "Human-only apps cannot be published to the agent registry."
    });
  }

  if (value.agentListingStatus !== AgentListingStatus.PUBLISHED) {
    return;
  }

  if (value.agentAudience === AppAudience.HUMAN) {
    context.addIssue({
      code: "custom",
      path: ["agentAudience"],
      message: "Agent registry listings must be agent-only or hybrid."
    });
  }

  if (!value.agentSummary?.trim() || value.agentSummary.trim().length < 20) {
    context.addIssue({
      code: "custom",
      path: ["agentSummary"],
      message: "Published agent listings need a clear agent summary."
    });
  }

  const activeCapabilities = value.agentCapabilities.filter((capability) => capability.status === AgentCapabilityStatus.ACTIVE);

  if (activeCapabilities.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["agentCapabilities"],
      message: "Published agent listings need at least one active capability."
    });
  }

  activeCapabilities.forEach((capability, index) => {
    if (capability.interfaceType !== AgentInterfaceType.DOCS_ONLY && !capability.endpointUrl && !capability.docsUrl) {
      context.addIssue({
        code: "custom",
        path: ["agentCapabilities", index, "endpointUrl"],
        message: "Active capabilities need an endpoint URL or docs URL."
      });
    }

    if (capability.interactionMode !== AgentInteractionMode.READ_ONLY) {
      context.addIssue({
        code: "custom",
        path: ["agentCapabilities", index, "interactionMode"],
        message: "Cotana's current registry only publishes read-only agent capabilities."
      });
    }

    if (!capability.inputSchemaJson || !capability.outputSchemaJson) {
      context.addIssue({
        code: "custom",
        path: ["agentCapabilities", index],
        message: "Active capabilities need input and output schemas."
      });
    }

    if (!capability.safetyNotes?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["agentCapabilities", index, "safetyNotes"],
        message: "Active capabilities need safety notes."
      });
    }
  });
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

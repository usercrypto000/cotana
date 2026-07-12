import { getRuntimeEnvironment, logServerEvent } from "@cotana/config/runtime";

export const analyticsEvents = {
  searchSubmitted: "search_submitted",
  searchResultClicked: "search_result_clicked",
  searchFilterChanged: "search_filter_changed",
  searchSortChanged: "search_sort_changed",
  appDetailViewed: "app_detail_viewed",
  appLiked: "app_liked",
  appSaved: "app_saved",
  reviewCreated: "review_created",
  reviewFlagged: "review_flagged",
  shelfImpression: "shelf_impression",
  shelfAppClicked: "shelf_app_clicked",
  trendingAppClicked: "trending_app_clicked",
  risingAppClicked: "rising_app_clicked",
  similarAppClicked: "similar_app_clicked",
  changelogViewed: "changelog_viewed",
  changelogItemClicked: "changelog_item_clicked",
  verifiedBadgeSeen: "verified_badge_seen",
  communityPickBadgeSeen: "community_pick_badge_seen",
  agentRegistrySearched: "agent_registry_searched",
  agentRegistryManifestViewed: "agent_registry_manifest_viewed",
  agentRegistryDiscoveryViewed: "agent_registry_discovery_viewed",
  agentRegistrySchemaViewed: "agent_registry_schema_viewed",
  agentRegistryCapabilitiesViewed: "agent_registry_capabilities_viewed",
  agentRegistryCompatibilityViewed: "agent_registry_compatibility_viewed",
  agentRegistryCapabilityViewed: "agent_registry_capability_viewed",
  agentRegistryPolicyViewed: "agent_registry_policy_viewed",
  authSignedUp: "auth_signed_up",
  authLoggedIn: "auth_logged_in"
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

type TrackEventInput = {
  event: AnalyticsEventName;
  distinctId: string;
  properties?: Record<string, unknown>;
};

let posthogClientPromise: Promise<import("posthog-node").PostHog | null> | null = null;

async function getPostHogClient() {
  if (posthogClientPromise) {
    return posthogClientPromise;
  }

  posthogClientPromise = (async () => {
    const env = getRuntimeEnvironment();

    if (!env.POSTHOG_KEY) {
      if (env.NODE_ENV === "production") {
        logServerEvent("warn", "PostHog is not configured. Analytics events will be skipped.", {
          scope: "analytics"
        });
      }

      return null;
    }

    const { PostHog } = await import("posthog-node");

    return new PostHog(env.POSTHOG_KEY, {
      host: env.POSTHOG_HOST
    });
  })();

  return posthogClientPromise;
}

export async function trackServerEvent({ event, distinctId, properties }: TrackEventInput) {
  const client = await getPostHogClient();

  if (!client) {
    return;
  }

  client.capture({
    event,
    distinctId,
    properties
  });
}

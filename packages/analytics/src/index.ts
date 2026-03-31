import { getRuntimeEnvironment, logServerEvent } from "@cotana/config/runtime";

export const analyticsEvents = {
  searchSubmitted: "search_submitted",
  searchResultClicked: "search_result_clicked",
  appDetailViewed: "app_detail_viewed",
  appLiked: "app_liked",
  appSaved: "app_saved",
  reviewCreated: "review_created",
  reviewFlagged: "review_flagged",
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

import { isAdminUser } from "@cotana/auth/authorization";
import { listFlaggedReviews } from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { ReviewModerationActions } from "../../components/review-moderation-actions";
import { AdminShell } from "../../components/admin-shell";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const sessionUser = await getSessionUser();
  const reviews = isAdminUser(sessionUser) ? await listFlaggedReviews() : [];

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell
        title="Flagged reviews"
        description="Moderation tools are only available to allowlisted admins."
      >
        <AdminAuthGate />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Flagged reviews"
      description="Flagged reviews stay visible publicly until an admin dismisses the report or removes the review."
    >
      {reviews.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Queue is empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">No flagged reviews need moderation right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{review.app.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">
                    Reviewer: {review.user.displayName ?? review.user.email ?? "Unknown user"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{review.status}</Badge>
                  <Badge variant="secondary">{review.flags.length} flag(s)</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{review.body}</p>
                <div className="grid gap-2">
                  {review.flags.map((flag) => (
                    <div key={flag.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">
                        {flag.reporterUser.displayName ?? flag.reporterUser.email ?? "Anonymous reporter"}
                      </p>
                      <p className="mt-1">{flag.reason}</p>
                    </div>
                  ))}
                </div>
                <ReviewModerationActions reviewId={review.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

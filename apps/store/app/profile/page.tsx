import Image from "next/image";
import { prisma } from "@cotana/db";
import { Card, CardContent, CardHeader, CardTitle, SectionHeading } from "@cotana/ui";
import { StoreHeader } from "../../components/store-header";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  const profile =
    sessionUser &&
    (await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        profile: true,
        _count: {
          select: {
            appLikes: true,
            libraryItems: true,
            reviews: true
          }
        }
      }
    }));

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-7 sm:px-6 sm:py-8">
        <SectionHeading
          eyebrow="Profile"
          title="Your Cotana profile"
          description="A small account surface for saved apps, likes, and review eligibility."
        />
        {!sessionUser || !profile ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in to view your profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[0.84rem] text-neutral-muted">
                Signing in unlocks your saved apps, likes, reviews, and eligibility checks.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-card bg-neutral-surface">
                  {profile.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt={`${profile.displayName ?? "Cotana user"} avatar`}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-14 w-14 object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <CardTitle>{profile.displayName ?? "Cotana user"}</CardTitle>
                  <p className="mt-1 text-[0.84rem] text-neutral-muted">{profile.email ?? "No email on file"}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-[0.84rem] text-neutral-muted">
                <p>Profile complete: {profile.profile?.profileCompleted ? "Yes" : "Not yet"}</p>
                <p>{profile.profile?.bio ?? "Your profile stays minimal while Cotana focuses on discovery."}</p>
              </CardContent>
            </Card>
            <div className="grid gap-3.5">
              <Card>
                <CardHeader>
                  <CardTitle>Saved apps</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="ui-metric-value text-[1.65rem] font-semibold">{profile._count.libraryItems}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Likes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="ui-metric-value text-[1.65rem] font-semibold">{profile._count.appLikes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="ui-metric-value text-[1.65rem] font-semibold">{profile._count.reviews}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

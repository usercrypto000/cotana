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
            reviews: true,
            appViews: true
          }
        }
      }
    }));

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <SectionHeading
          eyebrow="Profile"
          title="Your Cotana profile"
          description="Profile completeness feeds review eligibility, while your activity stays inside a consumer-style account surface."
        />
        {!sessionUser || !profile ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in to view your profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Signing in unlocks your saved apps, reviews, and personalized eligibility checks.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                  {profile.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt={`${profile.displayName ?? "Cotana user"} avatar`}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <CardTitle>{profile.displayName ?? "Cotana user"}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{profile.email ?? "No email on file"}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Profile complete: {profile.profile?.profileCompleted ? "Yes" : "Not yet"}</p>
                <p>{profile.profile?.bio ?? "Add a bio later if we open up richer profiles."}</p>
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Saved apps</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-semibold text-slate-950">{profile._count.libraryItems}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Likes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-semibold text-slate-950">{profile._count.appLikes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-semibold text-slate-950">{profile._count.reviews}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>App views</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-semibold text-slate-950">{profile._count.appViews}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

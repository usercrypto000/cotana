import { ReviewResolution, ReviewStatus } from "@prisma/client";
import type { ReviewEligibility } from "@cotana/types";
import { getCacheValue, setCacheValue } from "../redis";
import { prisma } from "../client";

const ACCOUNT_AGE_HOURS = 24;
const REVIEW_COOLDOWN_HOURS = 48;
const MIN_REVIEW_LENGTH = 80;
const MIN_APP_VIEWS = 3;
const REVIEW_COOLDOWN_CACHE_PREFIX = "review-cooldown";

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function maxDate(dates: Array<Date | null>) {
  const valid = dates.filter((value): value is Date => value instanceof Date);

  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((latest, current) => (current > latest ? current : latest));
}

export async function getReviewEligibility(userId: string, appId: string, body?: string): Promise<ReviewEligibility> {
  const cachedCooldown = await getCacheValue<string>(`${REVIEW_COOLDOWN_CACHE_PREFIX}:${userId}`);
  const cachedCooldownDate =
    cachedCooldown && !Number.isNaN(new Date(cachedCooldown).getTime()) ? new Date(cachedCooldown) : null;

  const [user, viewCount, lastPublishedReview, existingReview] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        displayName: true,
        avatarUrl: true
      }
    }),
    prisma.appView.count({
      where: {
        userId
      }
    }),
    cachedCooldownDate && cachedCooldownDate > new Date()
      ? Promise.resolve(null)
      : prisma.review.findFirst({
          where: {
            userId,
            status: ReviewStatus.PUBLISHED
          },
          orderBy: {
            createdAt: "desc"
          },
          select: {
            createdAt: true
          }
        }),
    prisma.review.findUnique({
      where: {
        appId_userId: {
          appId,
          userId
        }
      },
      select: {
        id: true
      }
    })
  ]);

  if (!user) {
    return {
      allowed: false,
      reasons: ["You must be signed in to review apps."],
      nextEligibleAt: null
    };
  }

  const reasons: string[] = [];
  const now = new Date();
  const accountAgeEligibleAt = addHours(user.createdAt, ACCOUNT_AGE_HOURS);
  const cooldownEligibleAt =
    cachedCooldownDate && cachedCooldownDate > now
      ? cachedCooldownDate
      : lastPublishedReview
        ? addHours(lastPublishedReview.createdAt, REVIEW_COOLDOWN_HOURS)
        : null;

  if (accountAgeEligibleAt > now) {
    reasons.push("Your account must be at least 24 hours old before you can post a review.");
  }

  if (!user.displayName) {
    reasons.push("Add a display name before posting a review.");
  }

  if (!user.avatarUrl) {
    reasons.push("Add an avatar before posting a review.");
  }

  if (viewCount < MIN_APP_VIEWS) {
    reasons.push("Browse at least 3 app detail pages before posting a review.");
  }

  if (cooldownEligibleAt && cooldownEligibleAt > now) {
    reasons.push("You must wait 48 hours between published reviews.");
  }

  if (existingReview) {
    reasons.push("You have already reviewed this app.");
  }

  if (typeof body === "string" && body.trim().length < MIN_REVIEW_LENGTH) {
    reasons.push(`Review body must be at least ${MIN_REVIEW_LENGTH} characters.`);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    nextEligibleAt: maxDate([accountAgeEligibleAt > now ? accountAgeEligibleAt : null, cooldownEligibleAt && cooldownEligibleAt > now ? cooldownEligibleAt : null])
  };
}

export async function createReview(input: {
  appId: string;
  userId: string;
  rating: number;
  body: string;
}) {
  const eligibility = await getReviewEligibility(input.userId, input.appId, input.body);

  if (!eligibility.allowed) {
    return {
      eligibility,
      review: null
    };
  }

  const review = await prisma.review.create({
    data: {
      appId: input.appId,
      userId: input.userId,
      rating: input.rating,
      body: input.body.trim(),
      status: ReviewStatus.PUBLISHED
    },
    include: {
      user: {
        select: {
          displayName: true,
          avatarUrl: true
        }
      }
    }
  });

  await setCacheValue(
    `${REVIEW_COOLDOWN_CACHE_PREFIX}:${input.userId}`,
    addHours(review.createdAt, REVIEW_COOLDOWN_HOURS).toISOString(),
    REVIEW_COOLDOWN_HOURS * 60 * 60,
  );

  return {
    eligibility,
    review
  };
}

export async function flagReview(input: {
  reviewId: string;
  reporterUserId: string;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const flag = await tx.reviewFlag.upsert({
      where: {
        reviewId_reporterUserId: {
          reviewId: input.reviewId,
          reporterUserId: input.reporterUserId
        }
      },
      update: {
        reason: input.reason.trim(),
        resolvedAt: null,
        resolution: null
      },
      create: {
        reviewId: input.reviewId,
        reporterUserId: input.reporterUserId,
        reason: input.reason.trim()
      }
    });

    await tx.review.update({
      where: { id: input.reviewId },
      data: {
        status: ReviewStatus.FLAGGED
      }
    });

    return flag;
  });
}

export async function listFlaggedReviews() {
  return prisma.review.findMany({
    where: {
      flags: {
        some: {
          resolvedAt: null
        }
      }
    },
    include: {
      app: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true
        }
      },
      flags: {
        where: {
          resolvedAt: null
        },
        include: {
          reporterUser: {
            select: {
              id: true,
              email: true,
              displayName: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function dismissReviewFlags(reviewId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.reviewFlag.updateMany({
      where: {
        reviewId,
        resolvedAt: null
      },
      data: {
        resolvedAt: new Date(),
        resolution: ReviewResolution.DISMISSED
      }
    });

    return tx.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.PUBLISHED
      }
    });
  });
}

export async function removeReview(reviewId: string, removalReason: string) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.REMOVED,
        removedAt: new Date(),
        removalReason
      }
    });

    await tx.reviewFlag.updateMany({
      where: {
        reviewId,
        resolvedAt: null
      },
      data: {
        resolvedAt: new Date(),
        resolution: ReviewResolution.REMOVED
      }
    });

    const existingStrikeCount = await tx.reviewModerationStrike.count({
      where: {
        userId: review.userId
      }
    });

    await tx.reviewModerationStrike.create({
      data: {
        userId: review.userId,
        reviewId: review.id,
        strikeNumber: existingStrikeCount + 1
      }
    });

    return review;
  });
}

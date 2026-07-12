CREATE TYPE "AppVerificationStatus" AS ENUM ('verified', 'reviewed', 'unreviewed', 'experimental');
CREATE TYPE "AppPublisherType" AS ENUM ('team', 'individual', 'protocol', 'unknown');

ALTER TABLE "App"
  ADD COLUMN "verificationStatus" "AppVerificationStatus" NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN "publisherName" TEXT,
  ADD COLUMN "publisherType" "AppPublisherType" NOT NULL DEFAULT 'unknown',
  ADD COLUMN "supportedChains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "permissionScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "paymentCapabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "custodyModel" TEXT,
  ADD COLUMN "externalRiskNotes" TEXT,
  ADD COLUMN "lastReviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewSummary" TEXT;

UPDATE "App"
SET
  "verificationStatus" = CASE WHEN "verified" THEN 'verified'::"AppVerificationStatus" ELSE 'unreviewed'::"AppVerificationStatus" END,
  "publisherType" = 'unknown'::"AppPublisherType",
  "lastReviewedAt" = COALESCE("verifiedUpdatedAt", "agentLastReviewedAt"),
  "reviewSummary" = COALESCE("verifiedNote", 'Cotana has not completed a full trust review for this app.');

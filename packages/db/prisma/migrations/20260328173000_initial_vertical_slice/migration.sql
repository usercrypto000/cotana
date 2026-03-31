CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'DEVELOPER_PORTAL');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'REMOVED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ReviewResolution" AS ENUM ('DISMISSED', 'REMOVED', 'NO_ACTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "privyDid" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppTag" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "AppTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppScreenshot" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "AppScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppEmbedding" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSignal" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "stringValue" TEXT,
    "jsonValue" JSONB,
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSignalSnapshot" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSignalSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewFlag" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" "ReviewResolution",

    CONSTRAINT "ReviewFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewModerationStrike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "strikeNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ReviewModerationStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppLike" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppLibraryItem" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "categoryHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchClick" (
    "id" TEXT NOT NULL,
    "searchEventId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppView" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigKV" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigKV_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_privyDid_key" ON "User"("privyDid");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");

-- CreateIndex
CREATE INDEX "App_categoryId_status_idx" ON "App"("categoryId", "status");

-- CreateIndex
CREATE INDEX "App_createdByUserId_idx" ON "App"("createdByUserId");

-- CreateIndex
CREATE INDEX "App_status_publishedAt_idx" ON "App"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "AppTag_appId_idx" ON "AppTag"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppTag_appId_tag_key" ON "AppTag"("appId", "tag");

-- CreateIndex
CREATE INDEX "AppScreenshot_appId_sortOrder_idx" ON "AppScreenshot"("appId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AppScreenshot_appId_sortOrder_key" ON "AppScreenshot"("appId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AppEmbedding_appId_key" ON "AppEmbedding"("appId");

-- CreateIndex
CREATE INDEX "AppEmbedding_embedding_cosine_idx" ON "AppEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- CreateIndex
CREATE INDEX "AppSignal_appId_signalType_idx" ON "AppSignal"("appId", "signalType");

-- CreateIndex
CREATE INDEX "AppSignal_signalKey_observedAt_idx" ON "AppSignal"("signalKey", "observedAt");

-- CreateIndex
CREATE INDEX "AppSignalSnapshot_appId_category_metric_idx" ON "AppSignalSnapshot"("appId", "category", "metric");

-- CreateIndex
CREATE INDEX "Review_appId_status_idx" ON "Review"("appId", "status");

-- CreateIndex
CREATE INDEX "Review_userId_createdAt_idx" ON "Review"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appId_userId_key" ON "Review"("appId", "userId");

-- CreateIndex
CREATE INDEX "ReviewFlag_reviewId_createdAt_idx" ON "ReviewFlag"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewFlag_reporterUserId_idx" ON "ReviewFlag"("reporterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewFlag_reviewId_reporterUserId_key" ON "ReviewFlag"("reviewId", "reporterUserId");

-- CreateIndex
CREATE INDEX "ReviewModerationStrike_userId_createdAt_idx" ON "ReviewModerationStrike"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppLike_appId_userId_key" ON "AppLike"("appId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppLibraryItem_appId_userId_key" ON "AppLibraryItem"("appId", "userId");

-- CreateIndex
CREATE INDEX "SearchEvent_userId_createdAt_idx" ON "SearchEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_normalizedQuery_idx" ON "SearchEvent"("normalizedQuery");

-- CreateIndex
CREATE INDEX "SearchClick_searchEventId_position_idx" ON "SearchClick"("searchEventId", "position");

-- CreateIndex
CREATE INDEX "SearchClick_appId_createdAt_idx" ON "SearchClick"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "AppView_appId_createdAt_idx" ON "AppView"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "AppView_userId_createdAt_idx" ON "AppView"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigKV_key_key" ON "ConfigKV"("key");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppTag" ADD CONSTRAINT "AppTag_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppScreenshot" ADD CONSTRAINT "AppScreenshot_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppEmbedding" ADD CONSTRAINT "AppEmbedding_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSignal" ADD CONSTRAINT "AppSignal_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSignalSnapshot" ADD CONSTRAINT "AppSignalSnapshot_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFlag" ADD CONSTRAINT "ReviewFlag_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFlag" ADD CONSTRAINT "ReviewFlag_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewModerationStrike" ADD CONSTRAINT "ReviewModerationStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewModerationStrike" ADD CONSTRAINT "ReviewModerationStrike_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppLike" ADD CONSTRAINT "AppLike_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppLike" ADD CONSTRAINT "AppLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppLibraryItem" ADD CONSTRAINT "AppLibraryItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppLibraryItem" ADD CONSTRAINT "AppLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchEvent" ADD CONSTRAINT "SearchEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchClick" ADD CONSTRAINT "SearchClick_searchEventId_fkey" FOREIGN KEY ("searchEventId") REFERENCES "SearchEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchClick" ADD CONSTRAINT "SearchClick_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppView" ADD CONSTRAINT "AppView_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppView" ADD CONSTRAINT "AppView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

-- AddCheckConstraint
ALTER TABLE "Review" ADD CONSTRAINT "Review_body_length_check" CHECK (char_length("body") >= 80);




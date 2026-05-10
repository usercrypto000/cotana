-- CreateEnum
CREATE TYPE "EditorialShelfStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EditorialShelfVisibility" AS ENUM ('HOME', 'CATEGORY', 'BOTH');

-- CreateTable
CREATE TABLE "EditorialShelf" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EditorialShelfStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visibility" "EditorialShelfVisibility" NOT NULL DEFAULT 'HOME',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "EditorialShelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialShelfItem" (
    "id" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialShelfItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EditorialShelf_slug_key" ON "EditorialShelf"("slug");

-- CreateIndex
CREATE INDEX "EditorialShelf_status_visibility_sortOrder_idx" ON "EditorialShelf"("status", "visibility", "sortOrder");

-- CreateIndex
CREATE INDEX "EditorialShelf_categoryId_status_visibility_sortOrder_idx" ON "EditorialShelf"("categoryId", "status", "visibility", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialShelfItem_shelfId_appId_key" ON "EditorialShelfItem"("shelfId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialShelfItem_shelfId_sortOrder_key" ON "EditorialShelfItem"("shelfId", "sortOrder");

-- CreateIndex
CREATE INDEX "EditorialShelfItem_appId_idx" ON "EditorialShelfItem"("appId");

-- AddForeignKey
ALTER TABLE "EditorialShelf" ADD CONSTRAINT "EditorialShelf_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialShelfItem" ADD CONSTRAINT "EditorialShelfItem_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "EditorialShelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialShelfItem" ADD CONSTRAINT "EditorialShelfItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

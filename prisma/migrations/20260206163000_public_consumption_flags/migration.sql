-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "detected_via" TEXT NOT NULL DEFAULT 'realtime',
ADD COLUMN     "historical" BOOLEAN NOT NULL DEFAULT false;


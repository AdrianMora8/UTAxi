-- AlterTable
ALTER TABLE "trip_requests" ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionCount" INTEGER NOT NULL DEFAULT 0;

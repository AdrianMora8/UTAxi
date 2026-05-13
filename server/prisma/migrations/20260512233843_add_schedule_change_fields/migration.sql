-- AlterTable
ALTER TABLE "trip_requests" ADD COLUMN     "scheduleChangeDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "departureTimeChangedAt" TIMESTAMP(3);

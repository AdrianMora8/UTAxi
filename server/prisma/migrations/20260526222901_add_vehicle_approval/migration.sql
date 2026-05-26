-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "blockedUntil" TIMESTAMP(3),
ADD COLUMN     "rejectionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectionNotes" TEXT,
ADD COLUMN     "status" "VehicleStatus" NOT NULL DEFAULT 'PENDING';

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'WALLET', 'CASH');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'CARD';

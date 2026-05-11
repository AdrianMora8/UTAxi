-- Drop the old unique constraint on tripRequestId alone
DROP INDEX IF EXISTS "ratings_tripRequestId_key";

-- Add composite unique constraint: one rating per (tripRequest, rater)
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_tripRequestId_raterId_key" UNIQUE ("tripRequestId", "raterId");

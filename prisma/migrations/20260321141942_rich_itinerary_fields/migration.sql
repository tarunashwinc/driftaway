-- AlterTable
ALTER TABLE "itinerary_days" ADD COLUMN     "accommodation" VARCHAR(200),
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "itinerary_items" ADD COLUMN     "booking_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "closed_on" TEXT[],
ADD COLUMN     "is_highlight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opening_hours" VARCHAR(100),
ADD COLUMN     "tip" TEXT,
ALTER COLUMN "activity" SET DATA TYPE VARCHAR(500);

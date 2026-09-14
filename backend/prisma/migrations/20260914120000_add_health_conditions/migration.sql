-- AlterTable
ALTER TABLE "User" ADD COLUMN     "healthConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "healthReviewedAt" TIMESTAMP(3);


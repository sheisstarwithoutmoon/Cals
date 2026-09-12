-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('LOSE', 'MAINTAIN', 'GAIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "currentWeight" DOUBLE PRECISION,
ADD COLUMN     "activityLevel" "ActivityLevel",
ADD COLUMN     "goalType" "GoalType",
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

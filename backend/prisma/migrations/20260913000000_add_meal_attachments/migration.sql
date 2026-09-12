-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'PDF');

-- AlterTable
ALTER TABLE "MealEntry" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "attachmentType" "AttachmentType";

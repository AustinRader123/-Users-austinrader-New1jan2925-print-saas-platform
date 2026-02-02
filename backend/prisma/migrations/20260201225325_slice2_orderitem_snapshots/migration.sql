-- AlterTable
ALTER TABLE "Design" ADD COLUMN     "exportAssets" JSONB,
ADD COLUMN     "mockupPreviewUrl" TEXT,
ADD COLUMN     "pricingSnapshot" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "exportAssets" JSONB,
ADD COLUMN     "mockupPreviewUrl" TEXT,
ADD COLUMN     "pricingSnapshot" JSONB;

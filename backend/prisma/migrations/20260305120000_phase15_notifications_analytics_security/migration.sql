/*
  Warnings:

  - You are about to drop the column `cartItemId` on the `Customization` table. All the data in the column will be lost.
  - You are about to drop the column `orderItemId` on the `Customization` table. All the data in the column will be lost.
  - Made the column `createdAt` on table `DnInventoryEventMap` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `InventoryEvent` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `InventoryEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationOutboxType" AS ENUM ('PROOF_REQUESTED', 'PROOF_APPROVED', 'INVOICE_SENT', 'PAYMENT_RECEIPT', 'SHIPMENT_CREATED', 'SHIPMENT_DELIVERED', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EventActorType" AS ENUM ('PUBLIC', 'USER', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CartStatus" ADD VALUE 'OPEN';
ALTER TYPE "CartStatus" ADD VALUE 'EXPIRED';

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_customizationId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_previewFileId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_customizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_previewFileId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderLine" DROP CONSTRAINT "PurchaseOrderLine_variantId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_productionJobId_fkey";

-- DropIndex
DROP INDEX "CartItem_previewFileId_idx";

-- DropIndex
DROP INDEX "Customization_cartItemId_key";

-- DropIndex
DROP INDEX "Customization_orderItemId_key";

-- DropIndex
DROP INDEX "OrderItem_previewFileId_idx";

-- DropIndex
DROP INDEX "Store_slug_idx";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "prefix" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "scopes" JSONB,
ADD COLUMN     "storeId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "key" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ArtworkAsset" ALTER COLUMN "tags" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ArtworkCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CheckoutSession" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Collection" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Customization" DROP COLUMN "cartItemId",
DROP COLUMN "orderItemId",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DnInventoryEventMap" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DocumentTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EmailProviderConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FundraiserCampaign" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FundraiserCampaignMember" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FundraiserCampaignProduct" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FundraiserConsolidationOrderLine" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FundraiserConsolidationRun" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FundraiserPayoutLedgerEntry" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryEvent" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "occurredAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InventoryItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryLocation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventorySku" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryStock" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InvoiceSequence" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Network" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OnboardingState" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Page" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PersonalizationSchema" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductCustomizationProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductionBatch" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProofApproval" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RoutedOrder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StoreBranding" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StoreCatalogBinding" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Storefront" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TeamStore" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ThemeConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WebhookDelivery" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WebhookEndpoint" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Webhook Endpoint',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "NotificationOutboxType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "to" TEXT NOT NULL,
    "payloadJson" JSONB,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "actorType" "EventActorType" NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "propertiesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecoNetworkConnection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "encryptedUsername" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecoNetworkConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "cursorJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationPayloadSnapshot" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" TEXT NOT NULL,

    CONSTRAINT "IntegrationPayloadSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "statsJson" JSONB,
    "errorCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncError" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT,
    "externalId" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "payloadHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnProductMap" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DnProductMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnVariantMap" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DnVariantMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnInventoryMap" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DnInventoryMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnOrderMap" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DnOrderMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnPurchaseOrderMap" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DnPurchaseOrderMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationTemplate_storeId_idx" ON "NotificationTemplate"("storeId");

-- CreateIndex
CREATE INDEX "NotificationTemplate_channel_idx" ON "NotificationTemplate"("channel");

-- CreateIndex
CREATE INDEX "NotificationTemplate_isActive_idx" ON "NotificationTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_storeId_key_key" ON "NotificationTemplate"("storeId", "key");

-- CreateIndex
CREATE INDEX "NotificationOutbox_storeId_idx" ON "NotificationOutbox"("storeId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_type_idx" ON "NotificationOutbox"("type");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_idx" ON "NotificationOutbox"("status");

-- CreateIndex
CREATE INDEX "NotificationOutbox_createdAt_idx" ON "NotificationOutbox"("createdAt");

-- CreateIndex
CREATE INDEX "EventLog_storeId_eventType_createdAt_idx" ON "EventLog"("storeId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "EventLog_storeId_idx" ON "EventLog"("storeId");

-- CreateIndex
CREATE INDEX "EventLog_eventType_idx" ON "EventLog"("eventType");

-- CreateIndex
CREATE INDEX "DecoNetworkConnection_storeId_idx" ON "DecoNetworkConnection"("storeId");

-- CreateIndex
CREATE INDEX "DecoNetworkConnection_tenantId_idx" ON "DecoNetworkConnection"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCursor_connectionId_entityType_key" ON "SyncCursor"("connectionId", "entityType");

-- CreateIndex
CREATE INDEX "IntegrationPayloadSnapshot_connectionId_entityType_idx" ON "IntegrationPayloadSnapshot"("connectionId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationPayloadSnapshot_connectionId_entityType_external_key" ON "IntegrationPayloadSnapshot"("connectionId", "entityType", "externalId", "hash");

-- CreateIndex
CREATE INDEX "SyncRun_connectionId_idx" ON "SyncRun"("connectionId");

-- CreateIndex
CREATE INDEX "SyncError_connectionId_idx" ON "SyncError"("connectionId");

-- CreateIndex
CREATE INDEX "SyncError_runId_idx" ON "SyncError"("runId");

-- CreateIndex
CREATE INDEX "DnProductMap_productId_idx" ON "DnProductMap"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DnProductMap_connectionId_externalId_key" ON "DnProductMap"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "DnVariantMap_variantId_idx" ON "DnVariantMap"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "DnVariantMap_connectionId_externalId_key" ON "DnVariantMap"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "DnInventoryMap_variantId_idx" ON "DnInventoryMap"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "DnInventoryMap_connectionId_externalId_key" ON "DnInventoryMap"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "DnOrderMap_orderId_idx" ON "DnOrderMap"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "DnOrderMap_connectionId_externalId_key" ON "DnOrderMap"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "DnPurchaseOrderMap_purchaseOrderId_idx" ON "DnPurchaseOrderMap"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DnPurchaseOrderMap_connectionId_externalId_key" ON "DnPurchaseOrderMap"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "ApiKey_storeId_idx" ON "ApiKey"("storeId");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "Network_tenantId_idx" ON "Network"("tenantId");

-- CreateIndex
CREATE INDEX "Network_enabled_idx" ON "Network"("enabled");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecoNetworkConnection" ADD CONSTRAINT "DecoNetworkConnection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncCursor" ADD CONSTRAINT "SyncCursor_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationPayloadSnapshot" ADD CONSTRAINT "IntegrationPayloadSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncError" ADD CONSTRAINT "SyncError_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncError" ADD CONSTRAINT "SyncError_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnProductMap" ADD CONSTRAINT "DnProductMap_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnProductMap" ADD CONSTRAINT "DnProductMap_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnVariantMap" ADD CONSTRAINT "DnVariantMap_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnVariantMap" ADD CONSTRAINT "DnVariantMap_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnInventoryMap" ADD CONSTRAINT "DnInventoryMap_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnInventoryMap" ADD CONSTRAINT "DnInventoryMap_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnInventoryEventMap" ADD CONSTRAINT "DnInventoryEventMap_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnInventoryEventMap" ADD CONSTRAINT "DnInventoryEventMap_inventoryEventId_fkey" FOREIGN KEY ("inventoryEventId") REFERENCES "InventoryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnOrderMap" ADD CONSTRAINT "DnOrderMap_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnOrderMap" ADD CONSTRAINT "DnOrderMap_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnPurchaseOrderMap" ADD CONSTRAINT "DnPurchaseOrderMap_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DecoNetworkConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnPurchaseOrderMap" ADD CONSTRAINT "DnPurchaseOrderMap_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "dn_inventory_event_map_inventory_event_id_key" RENAME TO "DnInventoryEventMap_inventoryEventId_key";

-- RenameIndex
ALTER INDEX "dn_inventory_event_map_store_dn_id_key" RENAME TO "DnInventoryEventMap_storeId_dnInventoryEventId_key";

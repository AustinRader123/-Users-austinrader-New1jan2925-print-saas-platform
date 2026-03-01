CREATE TYPE "SupplierName" AS ENUM ('SANMAR', 'SSACTIVEWEAR', 'ALPHABRODER', 'MOCK');
CREATE TYPE "SupplierAuthType" AS ENUM ('API_KEY', 'OAUTH2', 'BASIC', 'MOCK');
CREATE TYPE "SupplierSyncStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "SupplierSyncErrorScope" AS ENUM ('AUTH', 'FETCH', 'TRANSFORM', 'DOWNLOAD', 'DB');
ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'SUPPLIER_IMAGE';

ALTER TABLE "ProductVariant"
ADD COLUMN "supplierInventoryQty" INTEGER;

CREATE TABLE "SupplierConnection" (
	"id" TEXT NOT NULL,
	"storeId" TEXT NOT NULL,
	"supplier" "SupplierName" NOT NULL,
	"name" TEXT NOT NULL,
	"baseUrl" TEXT,
	"authType" "SupplierAuthType" NOT NULL,
	"credentialsEncrypted" TEXT NOT NULL,
	"enabled" BOOLEAN NOT NULL DEFAULT true,
	"lastSyncAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "SupplierConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalProductMap" (
	"id" TEXT NOT NULL,
	"storeId" TEXT NOT NULL,
	"supplierConnectionId" TEXT NOT NULL,
	"externalProductId" TEXT NOT NULL,
	"productId" TEXT NOT NULL,
	"externalMeta" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ExternalProductMap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalVariantMap" (
	"id" TEXT NOT NULL,
	"storeId" TEXT NOT NULL,
	"supplierConnectionId" TEXT NOT NULL,
	"externalVariantId" TEXT NOT NULL,
	"variantId" TEXT NOT NULL,
	"externalMeta" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ExternalVariantMap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalImageMap" (
	"id" TEXT NOT NULL,
	"storeId" TEXT NOT NULL,
	"supplierConnectionId" TEXT NOT NULL,
	"externalImageId" TEXT NOT NULL,
	"fileId" TEXT,
	"productImageId" TEXT NOT NULL,
	"externalMeta" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ExternalImageMap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierSyncRun" (
	"id" TEXT NOT NULL,
	"storeId" TEXT NOT NULL,
	"supplierConnectionId" TEXT NOT NULL,
	"status" "SupplierSyncStatus" NOT NULL DEFAULT 'QUEUED',
	"startedAt" TIMESTAMP(3),
	"finishedAt" TIMESTAMP(3),
	"durationMs" INTEGER,
	"attempts" INTEGER NOT NULL DEFAULT 0,
	"counts" JSONB,
	"errorSummary" TEXT,
	"logFileId" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "SupplierSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierSyncRunError" (
	"id" TEXT NOT NULL,
	"storeId" TEXT NOT NULL,
	"syncRunId" TEXT NOT NULL,
	"scope" "SupplierSyncErrorScope" NOT NULL,
	"message" TEXT NOT NULL,
	"meta" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "SupplierSyncRunError_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierConnection_storeId_idx" ON "SupplierConnection"("storeId");
CREATE INDEX "SupplierConnection_supplier_idx" ON "SupplierConnection"("supplier");
CREATE INDEX "SupplierConnection_enabled_idx" ON "SupplierConnection"("enabled");

CREATE UNIQUE INDEX "ExternalProductMap_supplierConnectionId_externalProductId_key"
ON "ExternalProductMap"("supplierConnectionId", "externalProductId");
CREATE INDEX "ExternalProductMap_storeId_idx" ON "ExternalProductMap"("storeId");
CREATE INDEX "ExternalProductMap_productId_idx" ON "ExternalProductMap"("productId");

CREATE UNIQUE INDEX "ExternalVariantMap_supplierConnectionId_externalVariantId_key"
ON "ExternalVariantMap"("supplierConnectionId", "externalVariantId");
CREATE INDEX "ExternalVariantMap_storeId_idx" ON "ExternalVariantMap"("storeId");
CREATE INDEX "ExternalVariantMap_variantId_idx" ON "ExternalVariantMap"("variantId");

CREATE UNIQUE INDEX "ExternalImageMap_supplierConnectionId_externalImageId_key"
ON "ExternalImageMap"("supplierConnectionId", "externalImageId");
CREATE INDEX "ExternalImageMap_storeId_idx" ON "ExternalImageMap"("storeId");
CREATE INDEX "ExternalImageMap_fileId_idx" ON "ExternalImageMap"("fileId");
CREATE INDEX "ExternalImageMap_productImageId_idx" ON "ExternalImageMap"("productImageId");

CREATE INDEX "SupplierSyncRun_storeId_idx" ON "SupplierSyncRun"("storeId");
CREATE INDEX "SupplierSyncRun_supplierConnectionId_idx" ON "SupplierSyncRun"("supplierConnectionId");
CREATE INDEX "SupplierSyncRun_status_idx" ON "SupplierSyncRun"("status");

CREATE INDEX "SupplierSyncRunError_storeId_idx" ON "SupplierSyncRunError"("storeId");
CREATE INDEX "SupplierSyncRunError_syncRunId_idx" ON "SupplierSyncRunError"("syncRunId");
CREATE INDEX "SupplierSyncRunError_scope_idx" ON "SupplierSyncRunError"("scope");

ALTER TABLE "SupplierConnection"
ADD CONSTRAINT "SupplierConnection_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalProductMap"
ADD CONSTRAINT "ExternalProductMap_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalProductMap"
ADD CONSTRAINT "ExternalProductMap_supplierConnectionId_fkey"
FOREIGN KEY ("supplierConnectionId") REFERENCES "SupplierConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalProductMap"
ADD CONSTRAINT "ExternalProductMap_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalVariantMap"
ADD CONSTRAINT "ExternalVariantMap_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalVariantMap"
ADD CONSTRAINT "ExternalVariantMap_supplierConnectionId_fkey"
FOREIGN KEY ("supplierConnectionId") REFERENCES "SupplierConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalVariantMap"
ADD CONSTRAINT "ExternalVariantMap_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalImageMap"
ADD CONSTRAINT "ExternalImageMap_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalImageMap"
ADD CONSTRAINT "ExternalImageMap_supplierConnectionId_fkey"
FOREIGN KEY ("supplierConnectionId") REFERENCES "SupplierConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalImageMap"
ADD CONSTRAINT "ExternalImageMap_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalImageMap"
ADD CONSTRAINT "ExternalImageMap_productImageId_fkey"
FOREIGN KEY ("productImageId") REFERENCES "ProductImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierSyncRun"
ADD CONSTRAINT "SupplierSyncRun_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierSyncRun"
ADD CONSTRAINT "SupplierSyncRun_supplierConnectionId_fkey"
FOREIGN KEY ("supplierConnectionId") REFERENCES "SupplierConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierSyncRun"
ADD CONSTRAINT "SupplierSyncRun_logFileId_fkey"
FOREIGN KEY ("logFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierSyncRunError"
ADD CONSTRAINT "SupplierSyncRunError_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierSyncRunError"
ADD CONSTRAINT "SupplierSyncRunError_syncRunId_fkey"
FOREIGN KEY ("syncRunId") REFERENCES "SupplierSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

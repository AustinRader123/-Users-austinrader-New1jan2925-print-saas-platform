-- Phase 7: onboarding, branding/theme, email, documents, public communication tokens

DO $$ BEGIN
  ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'QUOTE_PDF';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'INVOICE_PDF';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailProviderType" AS ENUM ('MOCK', 'SMTP', 'SENDGRID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailMessageType" AS ENUM ('PROOF_REQUEST', 'QUOTE_SENT', 'ORDER_CONFIRMATION', 'STATUS_UPDATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailMessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailEventType" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'OPEN', 'CLICK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('QUOTE', 'INVOICE', 'PROOF', 'WORK_ORDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentRefType" AS ENUM ('QUOTE', 'ORDER', 'PROOF_REQUEST', 'PRODUCTION_JOB');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OnboardingState" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT,
  "step" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StoreBranding" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "logoFileId" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#2563EB',
  "secondaryColor" TEXT NOT NULL DEFAULT '#0F172A',
  "fontPreset" TEXT NOT NULL DEFAULT 'INTER',
  "companyName" TEXT,
  "supportEmail" TEXT,
  "footerLinks" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ThemeConfig" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "storefrontId" TEXT,
  "config" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EmailProviderConfig" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "provider" "EmailProviderType" NOT NULL DEFAULT 'MOCK',
  "configEncrypted" TEXT,
  "fromName" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "replyTo" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EmailMessage" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT,
  "type" "EmailMessageType" NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyText" TEXT,
  "bodyHtml" TEXT,
  "status" "EmailMessageStatus" NOT NULL DEFAULT 'QUEUED',
  "providerMessageId" TEXT,
  "error" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "EmailEvent" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "emailMessageId" TEXT NOT NULL,
  "type" "EmailEventType" NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DocumentTemplate" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "template" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GeneratedDocument" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "refType" "DocumentRefType" NOT NULL,
  "refId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "QuotePublicToken" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InvoicePublicToken" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "OnboardingState_tenantId_storeId_key" ON "OnboardingState"("tenantId", "storeId");
CREATE INDEX IF NOT EXISTS "OnboardingState_tenantId_completed_idx" ON "OnboardingState"("tenantId", "completed");

CREATE UNIQUE INDEX IF NOT EXISTS "StoreBranding_storeId_key" ON "StoreBranding"("storeId");
CREATE INDEX IF NOT EXISTS "StoreBranding_storeId_idx" ON "StoreBranding"("storeId");

CREATE INDEX IF NOT EXISTS "ThemeConfig_storeId_publishedAt_idx" ON "ThemeConfig"("storeId", "publishedAt");
CREATE INDEX IF NOT EXISTS "ThemeConfig_storefrontId_idx" ON "ThemeConfig"("storefrontId");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailProviderConfig_tenantId_key" ON "EmailProviderConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "EmailProviderConfig_tenantId_provider_enabled_idx" ON "EmailProviderConfig"("tenantId", "provider", "enabled");

CREATE INDEX IF NOT EXISTS "EmailMessage_tenantId_createdAt_idx" ON "EmailMessage"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailMessage_storeId_createdAt_idx" ON "EmailMessage"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailMessage_status_type_idx" ON "EmailMessage"("status", "type");

CREATE INDEX IF NOT EXISTS "EmailEvent_tenantId_createdAt_idx" ON "EmailEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailEvent_emailMessageId_idx" ON "EmailEvent"("emailMessageId");

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentTemplate_storeId_type_name_key" ON "DocumentTemplate"("storeId", "type", "name");
CREATE INDEX IF NOT EXISTS "DocumentTemplate_storeId_type_active_idx" ON "DocumentTemplate"("storeId", "type", "active");

CREATE INDEX IF NOT EXISTS "GeneratedDocument_storeId_type_createdAt_idx" ON "GeneratedDocument"("storeId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_refType_refId_idx" ON "GeneratedDocument"("refType", "refId");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_fileId_idx" ON "GeneratedDocument"("fileId");

CREATE UNIQUE INDEX IF NOT EXISTS "QuotePublicToken_tokenHash_key" ON "QuotePublicToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "QuotePublicToken_tenantId_createdAt_idx" ON "QuotePublicToken"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "QuotePublicToken_storeId_quoteId_idx" ON "QuotePublicToken"("storeId", "quoteId");

CREATE UNIQUE INDEX IF NOT EXISTS "InvoicePublicToken_tokenHash_key" ON "InvoicePublicToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "InvoicePublicToken_tenantId_createdAt_idx" ON "InvoicePublicToken"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "InvoicePublicToken_storeId_orderId_idx" ON "InvoicePublicToken"("storeId", "orderId");

DO $$ BEGIN
  ALTER TABLE "OnboardingState" ADD CONSTRAINT "OnboardingState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "OnboardingState" ADD CONSTRAINT "OnboardingState_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StoreBranding" ADD CONSTRAINT "StoreBranding_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "StoreBranding" ADD CONSTRAINT "StoreBranding_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ThemeConfig" ADD CONSTRAINT "ThemeConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ThemeConfig" ADD CONSTRAINT "ThemeConfig_storefrontId_fkey" FOREIGN KEY ("storefrontId") REFERENCES "Storefront"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailProviderConfig" ADD CONSTRAINT "EmailProviderConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "QuotePublicToken" ADD CONSTRAINT "QuotePublicToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "QuotePublicToken" ADD CONSTRAINT "QuotePublicToken_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "QuotePublicToken" ADD CONSTRAINT "QuotePublicToken_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InvoicePublicToken" ADD CONSTRAINT "InvoicePublicToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InvoicePublicToken" ADD CONSTRAINT "InvoicePublicToken_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "InvoicePublicToken" ADD CONSTRAINT "InvoicePublicToken_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Phase 13: customer portal + billing/ledger + shipping adapter foundation

DO $$ BEGIN
  ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'SHIPPING_LABEL_PDF';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentLedgerEntryType" AS ENUM ('INVOICE_ISSUED', 'PAYMENT_RECEIVED', 'ADJUSTMENT', 'CREDIT_NOTE', 'REFUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "customerId" TEXT;

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "shippingAddress" JSONB,
  "billingAddress" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_storeId_email_key" ON "Customer"("storeId", "email");
CREATE INDEX IF NOT EXISTS "Customer_storeId_idx" ON "Customer"("storeId");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");

DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Shipment"
  ALTER COLUMN "productionJobId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "serviceLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "labelAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "labelStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE INDEX IF NOT EXISTS "Shipment_labelAssetId_idx" ON "Shipment"("labelAssetId");

DO $$ BEGIN
  ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_labelAssetId_fkey"
  FOREIGN KEY ("labelAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ShipmentEvent" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT,
  "message" TEXT,
  "payload" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ShipmentEvent_storeId_idx" ON "ShipmentEvent"("storeId");
CREATE INDEX IF NOT EXISTS "ShipmentEvent_shipmentId_idx" ON "ShipmentEvent"("shipmentId");
CREATE INDEX IF NOT EXISTS "ShipmentEvent_eventType_idx" ON "ShipmentEvent"("eventType");
CREATE INDEX IF NOT EXISTS "ShipmentEvent_occurredAt_idx" ON "ShipmentEvent"("occurredAt");

DO $$ BEGIN
  ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ISSUED',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shippingCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "balanceDueCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pdfAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
  ALTER TABLE "Invoice" ALTER COLUMN "pdfUrl" DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

UPDATE "Invoice" i
SET
  "totalCents" = COALESCE(i."totalCents", 0) + CASE
    WHEN COALESCE(i."totalCents", 0) = 0 THEN ROUND(o."totalAmount" * 100)::INTEGER
    ELSE 0
  END,
  "balanceDueCents" = CASE
    WHEN i."paidAt" IS NOT NULL THEN 0
    WHEN COALESCE(i."balanceDueCents", 0) = 0 THEN ROUND(o."totalAmount" * 100)::INTEGER
    ELSE i."balanceDueCents"
  END
FROM "Order" o
WHERE i."orderId" = o."id";

CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_pdfAssetId_idx" ON "Invoice"("pdfAssetId");

DO $$ BEGIN
  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_pdfAssetId_fkey"
  FOREIGN KEY ("pdfAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InvoiceLine" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitAmountCents" INTEGER NOT NULL,
  "totalAmountCents" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceLine_invoiceId_lineNumber_key" ON "InvoiceLine"("invoiceId", "lineNumber");
CREATE INDEX IF NOT EXISTS "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

DO $$ BEGIN
  ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InvoiceSequence" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSequence_storeId_year_key" ON "InvoiceSequence"("storeId", "year");
CREATE INDEX IF NOT EXISTS "InvoiceSequence_storeId_idx" ON "InvoiceSequence"("storeId");

DO $$ BEGIN
  ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentLedgerEntry" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "entryType" "PaymentLedgerEntryType" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "description" TEXT,
  "externalRef" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_storeId_idx" ON "PaymentLedgerEntry"("storeId");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_orderId_idx" ON "PaymentLedgerEntry"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_invoiceId_idx" ON "PaymentLedgerEntry"("invoiceId");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_entryType_idx" ON "PaymentLedgerEntry"("entryType");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_createdAt_idx" ON "PaymentLedgerEntry"("createdAt");

DO $$ BEGIN
  ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

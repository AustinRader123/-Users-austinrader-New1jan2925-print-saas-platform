-- AlterEnum
ALTER TYPE "PaymentLedgerEntryType" ADD VALUE IF NOT EXISTS 'CHARGE';

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT,
    "invoiceId" TEXT,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "clientSecret" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requires_confirmation',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxQuote" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT,
    "invoiceId" TEXT,
    "provider" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "breakdownJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentIntent_storeId_idx" ON "PaymentIntent"("storeId");
CREATE INDEX "PaymentIntent_orderId_idx" ON "PaymentIntent"("orderId");
CREATE INDEX "PaymentIntent_invoiceId_idx" ON "PaymentIntent"("invoiceId");
CREATE INDEX "PaymentIntent_provider_idx" ON "PaymentIntent"("provider");
CREATE INDEX "PaymentIntent_providerRef_idx" ON "PaymentIntent"("providerRef");
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");
CREATE INDEX "PaymentIntent_createdAt_idx" ON "PaymentIntent"("createdAt");

CREATE INDEX "TaxQuote_storeId_idx" ON "TaxQuote"("storeId");
CREATE INDEX "TaxQuote_orderId_idx" ON "TaxQuote"("orderId");
CREATE INDEX "TaxQuote_invoiceId_idx" ON "TaxQuote"("invoiceId");
CREATE INDEX "TaxQuote_provider_idx" ON "TaxQuote"("provider");
CREATE INDEX "TaxQuote_createdAt_idx" ON "TaxQuote"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaxQuote" ADD CONSTRAINT "TaxQuote_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxQuote" ADD CONSTRAINT "TaxQuote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxQuote" ADD CONSTRAINT "TaxQuote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

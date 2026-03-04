-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_invoice_serie
--
-- Creates the InvoiceSerie table to store per-branch invoice series configuration.
-- Each branch can have one series prefix for BOLETA and one for FACTURA.
-- The real correlativo is derived from the Invoice table at runtime.
-- Also adds nullable series shortcut columns on Branch for quick reference.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add nullable series columns to Branch (for quick reference / display)
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "seriesBoleta"    TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "seriesFactura"   TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "seriesNCBoleta"  TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "seriesNCFactura" TEXT;

-- Also add voidedBy / voidedAt / ncAppliedId to Invoice if not present
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "voidedBy"    INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "voidedAt"    TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ncAppliedId" INTEGER;

-- 2. Create InvoiceSerie table
CREATE TABLE IF NOT EXISTS "InvoiceSerie" (
    "id"        SERIAL          NOT NULL,
    "branchId"  INTEGER         NOT NULL,
    "companyId" INTEGER         NOT NULL,
    "type"      TEXT            NOT NULL,   -- BOLETA | FACTURA
    "serie"     TEXT            NOT NULL,   -- e.g., SM1, SM2, B001, F001
    "active"    BOOLEAN         NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceSerie_pkey" PRIMARY KEY ("id")
);

-- Unique: each branch can have only one serie per type (BOLETA / FACTURA)
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSerie_branchId_type_key"
    ON "InvoiceSerie"("branchId", "type");

-- Foreign keys
ALTER TABLE "InvoiceSerie"
    ADD CONSTRAINT "InvoiceSerie_branchId_fkey"
    FOREIGN KEY ("branchId")
    REFERENCES "Branch"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "InvoiceSerie"
    ADD CONSTRAINT "InvoiceSerie_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "Company"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

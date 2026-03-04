-- AlterTable Invoice: serie, correlativo, apisunat fields
ALTER TABLE "dbDental"."Invoice"
  ADD COLUMN "serie"            TEXT,
  ADD COLUMN "correlativo"      INTEGER,
  ADD COLUMN "apisunatStatus"   TEXT DEFAULT 'SKIPPED',
  ADD COLUMN "apisunatResponse" JSONB;

-- AlterTable Payment: currency
ALTER TABLE "dbDental"."Payment"
  ADD COLUMN "currency" TEXT DEFAULT 'SOLES';

-- AlterTable Company: apisunat credentials
ALTER TABLE "dbDental"."Company"
  ADD COLUMN "apisunatPersonaId"    TEXT,
  ADD COLUMN "apisunatPersonaToken" TEXT;

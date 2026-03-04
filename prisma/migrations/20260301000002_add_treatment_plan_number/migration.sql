-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_treatment_plan_number
--
-- Adds sequential numbering per company to TreatmentPlan so that each clinic
-- sees its own #1, #2, #3 … instead of the global database autoincrement id.
-- Also adds companyId and branchId for proper multi-tenant scoping.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New columns (all nullable to avoid issues with existing rows)
ALTER TABLE "TreatmentPlan" ADD COLUMN IF NOT EXISTS "number"    INTEGER;
ALTER TABLE "TreatmentPlan" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
ALTER TABLE "TreatmentPlan" ADD COLUMN IF NOT EXISTS "branchId"  INTEGER;

-- 2. Backfill companyId from the related patient
UPDATE "TreatmentPlan" tp
SET    "companyId" = p."companyId"
FROM   "Patient" p
WHERE  tp."patientId" = p."id"
  AND  tp."companyId" IS NULL;

-- 3. Backfill number — sequential per company ordered by creation date
WITH ranked AS (
    SELECT
        id,
        "companyId",
        ROW_NUMBER() OVER (
            PARTITION BY "companyId"
            ORDER BY "createdAt" ASC, id ASC
        ) AS rn
    FROM "TreatmentPlan"
    WHERE "companyId" IS NOT NULL
)
UPDATE "TreatmentPlan" tp
SET    "number" = r.rn
FROM   ranked r
WHERE  tp.id = r.id;

-- 4. Foreign key constraints
ALTER TABLE "TreatmentPlan"
    ADD CONSTRAINT "TreatmentPlan_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "Company"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "TreatmentPlan"
    ADD CONSTRAINT "TreatmentPlan_branchId_fkey"
    FOREIGN KEY ("branchId")
    REFERENCES "Branch"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "dbDental"."Invoice" ADD COLUMN "subtotal" DOUBLE PRECISION,
ADD COLUMN "igv" DOUBLE PRECISION,
ADD COLUMN "customerName" TEXT,
ADD COLUMN "documentType" TEXT,
ADD COLUMN "documentId" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "email" TEXT;

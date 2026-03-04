-- Cambiar status default de Invoice: PAID → EMITIDO
ALTER TABLE "dbDental"."Invoice"
  ALTER COLUMN "status" SET DEFAULT 'EMITIDO';

-- Actualizar registros existentes (PAID → EMITIDO para mantener consistencia)
UPDATE "dbDental"."Invoice" SET "status" = 'EMITIDO' WHERE "status" = 'PAID';

-- Crear tabla InvoiceDetail (detalle de comprobante)
CREATE TABLE "dbDental"."InvoiceDetail" (
  "id"          SERIAL       PRIMARY KEY,
  "invoiceId"   INTEGER      NOT NULL,
  "description" TEXT         NOT NULL,
  "quantity"    INTEGER      NOT NULL DEFAULT 1,
  "unitPrice"   DOUBLE PRECISION NOT NULL,
  "igvAmount"   DOUBLE PRECISION NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "discount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "toothNumber" TEXT,
  "serviceId"   INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceDetail_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "dbDental"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InvoiceDetail_serviceId_fkey"
    FOREIGN KEY ("serviceId")  REFERENCES "dbDental"."Service"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);

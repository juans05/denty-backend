-- ============================================================
-- Invoice: renombrar columnas a español + agregar nuevas
-- ============================================================

-- Renombres (campos existentes)
ALTER TABLE "dbDental"."Invoice" RENAME COLUMN "subtotal"     TO "montoSinIgv";
ALTER TABLE "dbDental"."Invoice" RENAME COLUMN "total"        TO "montoConIgv";
ALTER TABLE "dbDental"."Invoice" RENAME COLUMN "customerName" TO "razonSocial";
ALTER TABLE "dbDental"."Invoice" RENAME COLUMN "documentType" TO "tipoDocumento";
ALTER TABLE "dbDental"."Invoice" RENAME COLUMN "documentId"   TO "nroDocumento";
ALTER TABLE "dbDental"."Invoice" RENAME COLUMN "address"      TO "direccionCliente";

-- Nuevas columnas
ALTER TABLE "dbDental"."Invoice"
  ADD COLUMN "fechaEmision"     TIMESTAMP(3),
  ADD COLUMN "fechaVencimiento" TIMESTAMP(3),
  ADD COLUMN "importeEnLetras"  TEXT,
  ADD COLUMN "formaPago"        TEXT DEFAULT 'CONTADO',
  ADD COLUMN "empresaFacturar"  TEXT,
  ADD COLUMN "sedeNombre"       TEXT;

-- ============================================================
-- InvoiceDetail: renombrar columnas + agregar nuevas
-- ============================================================

ALTER TABLE "dbDental"."InvoiceDetail" RENAME COLUMN "description" TO "nombreProducto";
ALTER TABLE "dbDental"."InvoiceDetail" RENAME COLUMN "unitPrice"   TO "precioUnitario";
ALTER TABLE "dbDental"."InvoiceDetail" RENAME COLUMN "igvAmount"   TO "igv";
ALTER TABLE "dbDental"."InvoiceDetail" RENAME COLUMN "totalAmount" TO "precioConIgv";
ALTER TABLE "dbDental"."InvoiceDetail" RENAME COLUMN "discount"    TO "descuento";

-- Nuevas columnas
ALTER TABLE "dbDental"."InvoiceDetail"
  ADD COLUMN "itemCodigo"  TEXT,
  ADD COLUMN "precioSinIgv" DOUBLE PRECISION NOT NULL DEFAULT 0;

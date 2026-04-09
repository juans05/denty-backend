-- CreateTable Invoice (baseline fix - was missing from initial migration)
CREATE TABLE IF NOT EXISTS "dbDental"."Invoice" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "serie" TEXT,
    "correlativo" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'BOLETA',
    "status" TEXT NOT NULL DEFAULT 'EMITIDO',
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "montoSinIgv" DOUBLE PRECISION,
    "igv" DOUBLE PRECISION,
    "montoConIgv" DOUBLE PRECISION NOT NULL,
    "importeEnLetras" TEXT,
    "formaPago" TEXT DEFAULT 'CONTADO',
    "razonSocial" TEXT,
    "tipoDocumento" TEXT,
    "nroDocumento" TEXT,
    "direccionCliente" TEXT,
    "email" TEXT,
    "empresaFacturar" TEXT,
    "sedeNombre" TEXT,
    "apisunatStatus" TEXT,
    "apisunatResponse" JSONB,
    "patientId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "createdBy" INTEGER,
    "voidedBy" INTEGER,
    "voidedAt" TIMESTAMP(3),
    "ncAppliedId" INTEGER,
    "treatmentPlanId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_companyId_number_key" ON "dbDental"."Invoice"("companyId", "number");

-- AddForeignKey
ALTER TABLE "dbDental"."Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "dbDental"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dbDental"."Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "dbDental"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dbDental"."Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "dbDental"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dbDental"."Invoice" ADD CONSTRAINT "Invoice_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "dbDental"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dbDental"."Invoice" ADD CONSTRAINT "Invoice_voidedBy_fkey" FOREIGN KEY ("voidedBy") REFERENCES "dbDental"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dbDental"."Invoice" ADD CONSTRAINT "Invoice_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "dbDental"."TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable InvoiceDetail
CREATE TABLE IF NOT EXISTS "dbDental"."InvoiceDetail" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "itemCodigo" TEXT,
    "nombreProducto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "precioSinIgv" DOUBLE PRECISION NOT NULL,
    "igv" DOUBLE PRECISION NOT NULL,
    "precioConIgv" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toothNumber" TEXT,
    "serviceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDetail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey InvoiceDetail
ALTER TABLE "dbDental"."InvoiceDetail" ADD CONSTRAINT "InvoiceDetail_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "dbDental"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dbDental"."InvoiceDetail" ADD CONSTRAINT "InvoiceDetail_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "dbDental"."Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

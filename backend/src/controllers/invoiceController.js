const prisma = require('../utils/prisma');
const { buildInvoicePayload, sendToApisunat } = require('../services/apisunatService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte un TreatmentItem en una fila para InvoiceDetail */
function itemToDetail(item) {
    const discountPct  = item.discount || 0;
    const qty          = parseInt(item.quantity) || 1;
    const priceWithIgv = parseFloat(item.price) * (1 - discountPct / 100);

    const unitPriceSinIgv = priceWithIgv / 1.18;
    const unitIgv         = unitPriceSinIgv * 0.18;
    const totalAmount     = (unitPriceSinIgv + unitIgv) * qty;

    const description = item.service?.name
        ? item.service.name + (item.toothNumber ? ` (Pieza ${item.toothNumber})` : '')
        : 'Servicio dental';

    return {
        description,
        quantity:    qty,
        unitPrice:   parseFloat(unitPriceSinIgv.toFixed(2)),
        igvAmount:   parseFloat((unitIgv * qty).toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        discount:    discountPct,
        toothNumber: item.toothNumber || null,
        serviceId:   item.serviceId   || null
    };
}

// ─── createInvoice ────────────────────────────────────────────────────────────

const createInvoice = async (req, res) => {
    try {
        const { companyId } = req.user;
        const {
            type, total, subtotal, igv,
            customerName, documentType, documentId, address, email,
            patientId, treatmentPlanId, payments
        } = req.body;

        if (!total || !patientId) {
            return res.status(400).json({ message: 'Campos requeridos: total, patientId' });
        }

        // ── Datos de empresa (incluye credenciales APISUNAT) ───────────────
        const company = await prisma.company.findUnique({
            where: { id: parseInt(companyId) }
        });

        // ── Serie y correlativo ────────────────────────────────────────────
        const invoiceType    = type || 'BOLETA';
        const serie          = invoiceType === 'FACTURA' ? 'F001' : 'B001';
        const typeCode       = invoiceType === 'FACTURA' ? '01'   : '03';

        const lastInvoice = await prisma.invoice.findFirst({
            where:   { companyId: parseInt(companyId), serie },
            orderBy: { correlativo: 'desc' }
        });
        const correlativo    = (lastInvoice?.correlativo || 0) + 1;
        const correlativoPad = String(correlativo).padStart(8, '0');
        const invoiceNumber  = `${serie}-${correlativoPad}`;
        const fileName       = `${company.taxId}-${typeCode}-${invoiceNumber}`;

        // ── Ítems del plan de tratamiento ──────────────────────────────────
        let treatmentItems = [];
        if (treatmentPlanId) {
            treatmentItems = await prisma.treatmentItem.findMany({
                where:   { treatmentPlanId: parseInt(treatmentPlanId), status: 'DONE' },
                include: { service: true }
            });
            if (treatmentItems.length === 0) {
                treatmentItems = await prisma.treatmentItem.findMany({
                    where:   { treatmentPlanId: parseInt(treatmentPlanId) },
                    include: { service: true }
                });
            }
        }

        // ── Transacción: cabecera + detalle + pagos + estado presupuesto ───
        const invoice = await prisma.$transaction(async (tx) => {

            // 1. Cabecera (Invoice)
            const created = await tx.invoice.create({
                data: {
                    number:          invoiceNumber,
                    serie,
                    correlativo,
                    type:            invoiceType,
                    status:          'EMITIDO',
                    total:           parseFloat(total),
                    subtotal:        subtotal != null ? parseFloat(subtotal) : null,
                    igv:             igv      != null ? parseFloat(igv)      : null,
                    customerName:    customerName || null,
                    documentType:    documentType || null,
                    documentId:      documentId   || null,
                    address:         address      || null,
                    email:           email        || null,
                    patientId:       parseInt(patientId),
                    companyId:       parseInt(companyId),
                    treatmentPlanId: treatmentPlanId ? parseInt(treatmentPlanId) : null,
                    apisunatStatus:  'PENDING'
                }
            });

            // 2. Detalle de ítems (InvoiceDetail)
            if (treatmentItems.length > 0) {
                await tx.invoiceDetail.createMany({
                    data: treatmentItems.map(item => ({
                        invoiceId: created.id,
                        ...itemToDetail(item)
                    }))
                });
            }

            // 3. Pagos (Payment)
            if (Array.isArray(payments) && payments.length > 0) {
                await Promise.all(
                    payments.map(p =>
                        tx.payment.create({
                            data: {
                                amount:          parseFloat(p.amount),
                                method:          p.method   || 'CASH',
                                currency:        p.currency || 'SOLES',
                                reference:       p.reference || null,
                                cardType:        p.cardType  || null,
                                lot:             p.lot       || null,
                                appType:         p.appType   || null,
                                treatmentPlanId: treatmentPlanId ? parseInt(treatmentPlanId) : null,
                                companyId:       parseInt(companyId),
                                invoiceId:       created.id
                            }
                        })
                    )
                );
            }

            // 4. Marcar presupuesto como PAID
            if (treatmentPlanId) {
                await tx.treatmentPlan.update({
                    where: { id: parseInt(treatmentPlanId) },
                    data:  { status: 'PAID' }
                });
            }

            return created;
        });

        // ── Envío a APISUNAT (fallo no revierte el registro local) ────────
        let apisunatResult = null;

        if (company.apisunatPersonaId && company.apisunatPersonaToken) {
            try {
                const payload = buildInvoicePayload({
                    company,
                    invoice: {
                        ...invoice,
                        serie, correlativo,
                        type:     invoiceType,
                        subtotal: parseFloat(subtotal || 0),
                        igv:      parseFloat(igv      || 0),
                        total:    parseFloat(total)
                    },
                    customer: { customerName, documentType, documentId, address },
                    items:    treatmentItems
                });

                apisunatResult = await sendToApisunat(payload);

                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        apisunatStatus:   apisunatResult.ok ? 'SENT' : 'ERROR',
                        apisunatResponse: apisunatResult.data
                    }
                });
            } catch (apiError) {
                console.error('APISUNAT error:', apiError.message);
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        apisunatStatus:   'ERROR',
                        apisunatResponse: { error: apiError.message }
                    }
                });
            }
        } else {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data:  { apisunatStatus: 'SKIPPED' }
            });
        }

        // ── Respuesta completa: cabecera + detalle + pagos ─────────────────
        const full = await prisma.invoice.findUnique({
            where:   { id: invoice.id },
            include: {
                details:  { include: { service: true } },
                payments: true
            }
        });

        res.status(201).json({ ...full, fileName, apisunat: apisunatResult });

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ message: 'Error al crear el comprobante', error: error.message });
    }
};

// ─── getInvoices ──────────────────────────────────────────────────────────────

const getInvoices = async (req, res) => {
    try {
        const { companyId } = req.user;
        const invoices = await prisma.invoice.findMany({
            where:   { companyId: parseInt(companyId) },
            orderBy: { createdAt: 'desc' },
            include: {
                details:       { include: { service: true } },
                payments:      true,
                treatmentPlan: true
            }
        });
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Error al obtener comprobantes' });
    }
};

module.exports = { createInvoice, getInvoices };

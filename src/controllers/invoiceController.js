const prisma = require('../utils/prisma');
const { amountToWords, buildInvoicePayload, sendToApisunat, sendVoidToApisunat } = require('../services/apisunatService');

// ──────────────────────────────────────────────────────────────────────────────
// Helper: convierte un item del frontend → fila de InvoiceDetail
// Los precios llegan CON IGV; calculamos sin IGV y el monto de IGV (18 %)
// ──────────────────────────────────────────────────────────────────────────────
function itemToDetail(item) {
    const cantidad = parseInt(item.quantity || item.cantidad || 1);
    const precioConIgv = parseFloat(item.total || item.precioConIgv || 0); // total línea con IGV
    const descuento = parseFloat(item.discount || item.descuento || 0);

    // precio unitario con IGV
    const precioUnitConIgv = cantidad > 0 ? precioConIgv / cantidad : 0;
    // precio sin IGV (dividir entre 1.18)
    const precioSinIgv = parseFloat((precioConIgv / 1.18).toFixed(2));
    const precioUnitario = parseFloat((precioSinIgv / cantidad).toFixed(2));
    const igv = parseFloat((precioConIgv - precioSinIgv).toFixed(2));

    return {
        itemCodigo: item.itemCodigo || null,
        nombreProducto: item.nombreProducto || item.description || item.name || 'Servicio',
        cantidad,
        precioUnitario,
        precioSinIgv,
        igv,
        precioConIgv: parseFloat(precioConIgv.toFixed(2)),
        descuento,
        toothNumber: item.toothNumber || null,
        serviceId: item.serviceId ? parseInt(item.serviceId) : null
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/billing/invoices
// ──────────────────────────────────────────────────────────────────────────────
const createInvoice = async (req, res) => {
    try {
        const { companyId } = req.user;

        const {
            // cabecera obligatoria
            type,
            montoConIgv,
            patientId,
            // cabecera opcional
            montoSinIgv,
            igv,
            razonSocial,
            tipoDocumento,
            nroDocumento,
            direccionCliente,
            email,
            formaPago,
            empresaFacturar,
            sedeNombre,
            branchId,
            treatmentPlanId,
            // detalle e items
            items,
            // pagos
            payments
        } = req.body;
        const createdBy = req.user.id;
        const finalBranchId = branchId ? parseInt(branchId) : (req.user.branchId || null);

        // ── Validación básica ────────────────────────────────────────────────
        if (!montoConIgv || !patientId) {
            return res.status(400).json({ message: 'Campos requeridos: montoConIgv, patientId' });
        }

        // ── Empresa ──────────────────────────────────────────────────────────
        const company = await prisma.company.findUnique({
            where: { id: parseInt(companyId) }
        });
        if (!company) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }

        // ── Sede y Validaciones ──────────────────────────────────────────────
        const branch = await prisma.branch.findUnique({
            where: { id: finalBranchId || 0 }
        });

        if (!branch) {
            return res.status(404).json({ message: 'Sede no encontrada o no asignada para facturación' });
        }

        // ── Serie y correlativo ──────────────────────────────────────────────
        const invoiceType = type || 'BOLETA';
        let serie;

        if (invoiceType === 'BOLETA') {
            serie = branch.seriesBoleta;
            if (!serie) return res.status(400).json({ message: 'La sede no tiene asignada una serie para BOLETAS.' });
        } else if (invoiceType === 'FACTURA') {
            serie = branch.seriesFactura;
            if (!serie) return res.status(400).json({ message: 'La sede no tiene asignada una serie para FACTURAS.' });
        } else {
            return res.status(400).json({ message: 'Tipo de comprobante no válido' });
        }

        const lastInvoice = await prisma.invoice.findFirst({
            where: { companyId: parseInt(companyId), serie },
            orderBy: { correlativo: 'desc' }
        });
        const correlativo = (lastInvoice?.correlativo || 0) + 1;
        const number = `${serie}-${String(correlativo).padStart(8, '0')}`;

        // ── Importes ─────────────────────────────────────────────────────────
        const totalConIgv = parseFloat(montoConIgv);
        const totalSinIgv = montoSinIgv != null
            ? parseFloat(montoSinIgv)
            : parseFloat((totalConIgv / 1.18).toFixed(2));
        const totalIgv = igv != null
            ? parseFloat(igv)
            : parseFloat((totalConIgv - totalSinIgv).toFixed(2));
        const enLetras = amountToWords(totalConIgv);

        // ── Fechas ────────────────────────────────────────────────────────────
        const fechaEmision = new Date();
        const fechaVencimiento = new Date(fechaEmision);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

        // ── Transacción ──────────────────────────────────────────────────────
        const result = await prisma.$transaction(async (tx) => {

            // 1. Crear cabecera de comprobante
            const invoice = await tx.invoice.create({
                data: {
                    number,
                    serie,
                    correlativo,
                    type: invoiceType,
                    status: 'EMITIDO',
                    fechaEmision,
                    fechaVencimiento,
                    montoSinIgv: totalSinIgv,
                    igv: totalIgv,
                    montoConIgv: totalConIgv,
                    importeEnLetras: enLetras,
                    formaPago: formaPago || 'CONTADO',
                    razonSocial: razonSocial || null,
                    tipoDocumento: tipoDocumento || null,
                    nroDocumento: nroDocumento || null,
                    direccionCliente: direccionCliente || null,
                    email: email || null,
                    empresaFacturar: empresaFacturar || company.name,
                    sedeNombre: sedeNombre || null,
                    patientId: parseInt(patientId),
                    companyId: parseInt(companyId),
                    branchId: finalBranchId,
                    createdBy: parseInt(createdBy),
                    treatmentPlanId: treatmentPlanId ? parseInt(treatmentPlanId) : null,
                    apisunatStatus: 'PENDING'
                }
            });

            // 2. Crear líneas de detalle
            if (items && Array.isArray(items) && items.length > 0) {
                await tx.invoiceDetail.createMany({
                    data: items.map(item => ({
                        invoiceId: invoice.id,
                        ...itemToDetail(item)
                    }))
                });
            }

            // 3. Registrar pagos
            if (payments && Array.isArray(payments)) {
                const validPayments = payments.filter(p => parseFloat(p.amount) > 0);
                if (validPayments.length > 0) {
                    await tx.payment.createMany({
                        data: validPayments.map(p => ({
                            amount: parseFloat(p.amount),
                            method: p.method || 'CASH',
                            currency: p.currency || 'SOLES',
                            reference: p.reference || null,
                            cardType: p.cardType || null,
                            lot: p.lot || null,
                            appType: p.appType || null,
                            treatmentPlanId: treatmentPlanId ? parseInt(treatmentPlanId) : null,
                            companyId: parseInt(companyId),
                            invoiceId: invoice.id
                        }))
                    });
                }
            }

            // 3B. Marcar ítems del plan como INVOICED
            // El frontend envía itemIds: array de TreatmentItem.id que se están facturando
            const itemIds = req.body.itemIds;
            if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
                await tx.treatmentItem.updateMany({
                    where: { id: { in: itemIds.map(id => parseInt(id)) } },
                    data: { status: 'INVOICED', invoiceId: invoice.id }
                });
            }

            // 4. Calcular total pagado y actualizar estado del plan de tratamiento
            if (treatmentPlanId) {
                // Para el cálculo de pendiente: sumar TODOS los pagos del plan (previos + este)
                const allPlanPayments = await tx.payment.findMany({
                    where: { treatmentPlanId: parseInt(treatmentPlanId) }
                });
                const totalPagado = allPlanPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);

                // El total del plan son todos sus ítems (pagados o no)
                const allPlanItems = await tx.treatmentItem.findMany({
                    where: { treatmentPlanId: parseInt(treatmentPlanId) }
                });
                const totalPlan = allPlanItems.reduce((acc, i) => acc + (i.price * i.quantity * (1 - (i.discount || 0) / 100)), 0);
                const montoPendiente = parseFloat((totalPlan - totalPagado).toFixed(2));

                let planStatus;
                if (montoPendiente <= 0) {
                    planStatus = 'PAID';
                } else if (totalPagado > 0) {
                    planStatus = 'PARTIAL_PAYMENT';
                } else {
                    planStatus = 'PENDING_PAYMENT';
                }

                await tx.treatmentPlan.update({
                    where: { id: parseInt(treatmentPlanId) },
                    data: {
                        status: planStatus,
                        ...(montoPendiente > 0 && { montoPendiente })
                    }
                });

                invoice._planStatus = planStatus;
                invoice._montoPendiente = montoPendiente > 0 ? montoPendiente : 0;
                invoice._totalPagado = totalPagado;
            }

            return invoice;
        });


        // ── Enviar a APISUNAT (fuera de la transacción para no bloquearla) ───
        if (company.apisunatPersonaId && company.apisunatPersonaToken) {
            try {
                const details = await prisma.invoiceDetail.findMany({
                    where: { invoiceId: result.id },
                    include: { service: true }
                });
                const payload = buildInvoicePayload({
                    company,
                    invoice: result,
                    customer: {
                        customerName: result.razonSocial,
                        documentType: result.tipoDocumento,
                        documentId: result.nroDocumento,
                        address: result.direccionCliente
                    },
                    items: details.map(d => ({
                        ...d,
                        price: d.precioConIgv / d.cantidad,
                        quantity: d.cantidad,
                        discount: d.descuento || 0
                    }))
                });
                const apiRes = await sendToApisunat(payload);
                const apisunatStatus = apiRes.ok ? 'SENT' : 'ERROR';

                await prisma.invoice.update({
                    where: { id: result.id },
                    data: { apisunatStatus, apisunatResponse: apiRes }
                });
                result.apisunatStatus = apisunatStatus;
                result.apisunatResponse = apiRes;
            } catch (apiErr) {
                console.error('APISUNAT Exception:', apiErr.message);
                await prisma.invoice.update({
                    where: { id: result.id },
                    data: { apisunatStatus: 'ERROR', apisunatResponse: { error: apiErr.message } }
                });
                result.apisunatStatus = 'ERROR';
            }
        } else {
            await prisma.invoice.update({
                where: { id: result.id },
                data: { apisunatStatus: 'SKIPPED' }
            });
            result.apisunatStatus = 'SKIPPED';
        }

        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ message: 'Error al crear el comprobante', error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/billing/invoices
// ──────────────────────────────────────────────────────────────────────────────
const getInvoices = async (req, res) => {
    try {
        const { companyId, branchId, role } = req.user;
        
        const where = { companyId: parseInt(companyId) };
        if (role !== 'ADMIN' && branchId) {
            where.branchId = parseInt(branchId);
        }

        const invoices = await prisma.invoice.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                treatmentPlan: true,
                details: true,
                payments: true
            }
        });
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Error al obtener comprobantes' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/billing/invoices/:id
// ──────────────────────────────────────────────────────────────────────────────
const getInvoiceById = async (req, res) => {
    try {
        const { companyId, branchId, role } = req.user;
        const { id } = req.params;

        const where = { id: parseInt(id), companyId: parseInt(companyId) };
        if (role !== 'ADMIN' && branchId) {
            where.branchId = parseInt(branchId);
        }

        const invoice = await prisma.invoice.findFirst({
            where,
            include: { details: true, payments: true, treatmentPlan: true }
        });
        if (!invoice) return res.status(404).json({ message: 'Comprobante no encontrado' });
        res.json(invoice);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ message: 'Error al obtener el comprobante' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/billing/patient/:patientId  — Estado de Cuenta del paciente
// ──────────────────────────────────────────────────────────────────────────────
const getPatientStatement = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { patientId } = req.params;

        // Planes de tratamiento con sus pagos e ítems
        const plans = await prisma.treatmentPlan.findMany({
            where: { patientId: parseInt(patientId), doctor: { companyId: parseInt(companyId) } },
            include: {
                items: { include: { service: { select: { id: true, name: true } } } },
                payments: { orderBy: { createdAt: 'desc' } },
                invoices: {
                    select: {
                        id: true, number: true, type: true, status: true,
                        montoConIgv: true, fechaEmision: true, createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                doctor: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calcular resumen por plan
        const plansWithSummary = plans.map(plan => {
            const totalBruto = plan.items.reduce((acc, i) =>
                acc + (i.price * i.quantity * (1 - (i.discount || 0) / 100)), 0);
            const totalDiscount = plan.discount || 0;
            const totalPlan = totalBruto * (1 - totalDiscount / 100);
            const totalPagado = plan.payments.reduce((acc, p) => acc + p.amount, 0);
            const saldo = parseFloat((totalPlan - totalPagado).toFixed(2));
            return { ...plan, _totalPlan: parseFloat(totalPlan.toFixed(2)), _totalPagado: parseFloat(totalPagado.toFixed(2)), _saldo: saldo };
        });

        // Resumen global
        const resumen = plansWithSummary.reduce((acc, p) => ({
            totalPlanes: acc.totalPlanes + p._totalPlan,
            totalPagado: acc.totalPagado + p._totalPagado,
            totalPendiente: acc.totalPendiente + Math.max(0, p._saldo)
        }), { totalPlanes: 0, totalPagado: 0, totalPendiente: 0 });

        res.json({ plans: plansWithSummary, resumen });
    } catch (error) {
        console.error('Error getPatientStatement:', error);
        res.status(500).json({ message: 'Error al obtener estado de cuenta', error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/billing/invoice-series
// ──────────────────────────────────────────────────────────────────────────────
const getInvoiceSeries = async (req, res) => {
    try {
        const { companyId } = req.user;
        const series = await prisma.invoiceSerie.findMany({
            where: { companyId: parseInt(companyId) },
            include: { branch: { select: { id: true, name: true } } },
            orderBy: [{ branch: { name: 'asc' } }, { type: 'asc' }]
        });
        res.json(series);
    } catch (error) {
        console.error('Error getInvoiceSeries:', error);
        res.status(500).json({ message: 'Error al obtener series', error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/billing/invoice-series  (upsert: branchId + type es único)
// ──────────────────────────────────────────────────────────────────────────────
const upsertInvoiceSerie = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { branchId, type, serie } = req.body;

        if (!branchId || !type || !serie) {
            return res.status(400).json({ message: 'Campos requeridos: branchId, type, serie' });
        }

        const normalizedSerie = serie.trim().toUpperCase();

        // Save to InvoiceSerie table
        const result = await prisma.invoiceSerie.upsert({
            where: { branchId_type: { branchId: parseInt(branchId), type } },
            update: { serie: normalizedSerie, active: true, updatedAt: new Date() },
            create: {
                branchId: parseInt(branchId),
                companyId: parseInt(companyId),
                type,
                serie: normalizedSerie
            },
            include: { branch: { select: { id: true, name: true } } }
        });

        // Also sync to Branch columns so the invoice controller can read them directly
        const branchUpdate = {};
        if (type === 'BOLETA') branchUpdate.seriesBoleta = normalizedSerie;
        if (type === 'FACTURA') branchUpdate.seriesFactura = normalizedSerie;
        if (type === 'NC_BOLETA') branchUpdate.seriesNCBoleta = normalizedSerie;
        if (type === 'NC_FACTURA') branchUpdate.seriesNCFactura = normalizedSerie;

        if (Object.keys(branchUpdate).length > 0) {
            await prisma.branch.update({ where: { id: parseInt(branchId) }, data: branchUpdate });
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Error upsertInvoiceSerie:', error);
        res.status(500).json({ message: 'Error al guardar serie', error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/billing/invoice-series/:id
// ──────────────────────────────────────────────────────────────────────────────
const deleteInvoiceSerie = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.invoiceSerie.findUnique({ where: { id: parseInt(id) } });
        if (!existing) return res.status(404).json({ message: 'Serie no encontrada' });

        await prisma.invoiceSerie.delete({ where: { id: parseInt(id) } });

        // Clear the corresponding Branch column
        const branchUpdate = {};
        if (existing.type === 'BOLETA') branchUpdate.seriesBoleta = null;
        if (existing.type === 'FACTURA') branchUpdate.seriesFactura = null;
        if (existing.type === 'NC_BOLETA') branchUpdate.seriesNCBoleta = null;
        if (existing.type === 'NC_FACTURA') branchUpdate.seriesNCFactura = null;

        if (Object.keys(branchUpdate).length > 0) {
            await prisma.branch.update({ where: { id: existing.branchId }, data: branchUpdate });
        }

        res.json({ message: 'Serie eliminada correctamente' });
    } catch (error) {
        console.error('Error deleteInvoiceSerie:', error);
        res.status(500).json({ message: 'Error al eliminar serie', error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/billing/invoices/:id/void
// ──────────────────────────────────────────────────────────────────────────────
const voidInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const { reason } = req.body;
        const userId = req.user.id;

        const invoice = await prisma.invoice.findFirst({
            where: { id: parseInt(id), companyId: parseInt(companyId) }
        });

        if (!invoice) return res.status(404).json({ message: 'Comprobante no encontrado' });
        if (invoice.status === 'ANULADO') return res.status(400).json({ message: 'El comprobante ya está anulado' });

        // Actualizar estado y registrar quién anula
        const updated = await prisma.invoice.update({
            where: { id: parseInt(id) },
            data: {
                status: 'ANULADO',
                voidedBy: parseInt(userId),
                voidedAt: new Date()
            }
        });

        // Revertir ítems de tratamiento vinculados (volver de INVOICED a COMPLETED)
        await prisma.treatmentItem.updateMany({
            where: { invoiceId: parseInt(id) },
            data: { status: 'COMPLETED', invoiceId: null }
        });

        // ── Enviar ANULACIÓN a APISUNAT ──
        const company = await prisma.company.findUnique({ where: { id: parseInt(companyId) } });
        if (company?.apisunatPersonaId && company?.apisunatPersonaToken) {
            try {
                // APISUNAT voidBill requiere personaId, personaToken, documentId y reason
                const payload = {
                    personaId: company.apisunatPersonaId,
                    personaToken: company.apisunatPersonaToken,
                    documentId: invoice.apisunatResponse?.documentId,
                    reason: reason || 'Anulación por error en emisión'
                };
                if (!payload.documentId) {
                    console.error('No se puede anular: falta apisunat documentId');
                } else {
                    const voidRes = await sendVoidToApisunat(payload);
                    await prisma.invoice.update({
                        where: { id: parseInt(id) },
                        data: { 
                            apisunatStatus: voidRes.ok ? 'VOIDED' : 'ERROR', 
                            apisunatResponse: { ...invoice.apisunatResponse, voidResult: voidRes }
                        }
                    });
                    updated.apisunatStatus = voidRes.ok ? 'VOIDED' : 'ERROR';
                    updated.voidResult = voidRes;
                }
            } catch (err) {
                console.error('APISUNAT Void Exception:', err.message);
                await prisma.invoice.update({
                    where: { id: parseInt(id) },
                    data: { apisunatStatus: 'ERROR', apisunatResponse: { error: err.message } }
                });
            }
        }

        res.json(updated);
    } catch (error) {
        console.error('Error voidInvoice:', error);
        res.status(500).json({ message: 'Error al anular comprobante', error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/billing/invoices/:id/credit-note  (Nota de Crédito)
// ──────────────────────────────────────────────────────────────────────────────
const createCreditNote = async (req, res) => {
    try {
        const { id } = req.params; // ID de la factura original
        const { companyId } = req.user;
        const userId = req.user.id;

        const original = await prisma.invoice.findFirst({
            where: { id: parseInt(id), companyId: parseInt(companyId) },
            include: { branch: true, details: true }
        });

        if (!original) return res.status(404).json({ message: 'Comprobante original no encontrado' });

        const branch = original.branch;
        const serieStr = original.type === 'FACTURA' ? branch?.seriesNCFactura : branch?.seriesNCBoleta;

        if (!serieStr) {
            return res.status(400).json({ message: 'La sede no tiene configurada la serie para Notas de Crédito.' });
        }

        // Obtener correlativo para la NC
        const lastNC = await prisma.invoice.findFirst({
            where: { companyId: parseInt(companyId), serie: serieStr },
            orderBy: { correlativo: 'desc' }
        });
        const correlativo = (lastNC?.correlativo || 0) + 1;
        const number = `${serieStr}-${String(correlativo).padStart(8, '0')}`;

        // Crear la NC (copiando datos de la original)
        const nc = await prisma.invoice.create({
            data: {
                number,
                serie: serieStr,
                correlativo,
                type: 'NOTA_CREDITO',
                status: 'EMITIDO',
                fechaEmision: new Date(),
                montoConIgv: original.montoConIgv,
                montoSinIgv: original.montoSinIgv,
                igv: original.igv,
                importeEnLetras: original.importeEnLetras,
                formaPago: original.formaPago,
                razonSocial: original.razonSocial,
                tipoDocumento: original.tipoDocumento,
                nroDocumento: original.nroDocumento,
                direccionCliente: original.direccionCliente,
                email: original.email,
                empresaFacturar: original.empresaFacturar,
                sedeNombre: original.sedeNombre,
                patientId: original.patientId,
                companyId: parseInt(companyId),
                branchId: original.branchId,
                createdBy: parseInt(userId),
                ncAppliedId: original.id,
                apisunatStatus: 'PENDING'
            }
        });

        // Copiar detalles
        if (original.details.length > 0) {
            await prisma.invoiceDetail.createMany({
                data: original.details.map(d => ({
                    invoiceId: nc.id,
                    itemCodigo: d.itemCodigo,
                    nombreProducto: d.nombreProducto,
                    cantidad: d.cantidad,
                    precioUnitario: d.precioUnitario,
                    precioSinIgv: d.precioSinIgv,
                    igv: d.igv,
                    precioConIgv: d.precioConIgv,
                    descuento: d.descuento,
                    toothNumber: d.toothNumber,
                    serviceId: d.serviceId
                }))
            });
        }

        // ── Enviar NOTA DE CRÉDITO a APISUNAT ──
        const company = await prisma.company.findUnique({ where: { id: parseInt(companyId) } });
        if (company?.apisunatPersonaId && company?.apisunatPersonaToken) {
            try {
                const details = await prisma.invoiceDetail.findMany({
                    where: { invoiceId: nc.id },
                    include: { service: true }
                });
                const payload = buildInvoicePayload({
                    company,
                    invoice: nc,
                    customer: {
                        customerName: nc.razonSocial,
                        documentType: nc.tipoDocumento,
                        documentId: nc.nroDocumento,
                        address: nc.direccionCliente
                    },
                    items: details.map(d => ({
                        ...d,
                        price: d.precioConIgv / d.cantidad,
                        quantity: d.cantidad,
                        discount: d.descuento || 0
                    })),
                    originalDoc: original // Importante para NC
                });
                const apiRes = await sendToApisunat(payload);
                const apisunatStatus = apiRes.ok ? 'SENT' : 'ERROR';

                await prisma.invoice.update({
                    where: { id: nc.id },
                    data: { apisunatStatus, apisunatResponse: apiRes }
                });
                nc.apisunatStatus = apisunatStatus;
                nc.apisunatResponse = apiRes;
            } catch (err) {
                console.error('APISUNAT NC Exception:', err.message);
                await prisma.invoice.update({
                    where: { id: nc.id },
                    data: { apisunatStatus: 'ERROR', apisunatResponse: { error: err.message } }
                });
            }
        }

        res.status(201).json(nc);
    } catch (error) {
        console.error('Error createCreditNote:', error);
        res.status(500).json({ message: 'Error al generar Nota de Crédito', error: error.message });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    getPatientStatement,
    getInvoiceSeries,
    upsertInvoiceSerie,
    deleteInvoiceSerie,
    voidInvoice,
    createCreditNote
};

const prisma = require('../utils/prisma');

// GET /api/treatments?patientId=X
const getTreatmentPlans = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { patientId } = req.query;

        const where = {};
        if (patientId) where.patientId = parseInt(patientId);
        // Scope to company via patient
        if (patientId) {
            const patient = await prisma.patient.findFirst({ where: { id: parseInt(patientId), companyId } });
            if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        const plans = await prisma.treatmentPlan.findMany({
            where,
            include: {
                doctor: { select: { id: true, name: true } },
                patient: { select: { id: true, firstName: true, paternalSurname: true } },
                items: {
                    include: {
                        service: { select: { id: true, name: true, category: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                payments: true,
                branch: true,
                invoices: {
                    include: {
                        items: { include: { service: true } },
                        company: true,
                        branch: true
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        console.log(`Sending ${plans.length} plans. Plan 7 invoices:`, plans.find(p => p.id === 7)?.invoices?.length);
        res.json(plans);
    } catch (error) {
        console.error('Error getTreatmentPlans:', error);
        res.status(500).json({ message: 'Error al obtener planes', detail: error.message });
    }
};

// GET /api/treatments/:id
const getTreatmentPlanById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const plan = await prisma.treatmentPlan.findUnique({
            where: { id },
            include: {
                doctor: { select: { id: true, name: true } },
                patient: { select: { id: true, firstName: true, paternalSurname: true, documentId: true } },
                items: {
                    include: { service: true },
                    orderBy: { createdAt: 'asc' },
                },
                payments: true,
                branch: true,
                invoices: {
                    include: {
                        items: { include: { service: true } },
                        company: true,
                        branch: true
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
        });
        if (!plan) return res.status(404).json({ message: 'Plan de tratamiento no encontrado' });
        console.log(`[DEBUG] getTreatmentPlanById(${id}): Found ${plan.invoices?.length || 0} invoices.`);
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener plan', detail: error.message });
    }
};

// POST /api/treatments
const createTreatmentPlan = async (req, res) => {
    try {
        const { patientId, doctorId, name, discount, notes, notesPatient, notesInternal, items } = req.body;

        if (!patientId || !doctorId) {
            return res.status(400).json({ message: 'Campos requeridos: patientId, doctorId' });
        }

        const companyId = req.user.companyId;
        let branchId = req.user.branchId ? parseInt(req.user.branchId) : null;
        
        // AUTO-FALLBACK: Si el usuario no tiene sede (ej: es un admin), 
        // asignamos la primera sede activa de la empresa como default para evitar errores de facturación.
        if (!branchId) {
            const firstBranch = await prisma.branch.findFirst({
                where: { companyId, active: true },
                orderBy: { id: 'asc' }
            });
            if (firstBranch) {
                branchId = firstBranch.id;
            }
        }

        // Número secuencial por empresa: MAX(number) + 1
        const aggregate = await prisma.treatmentPlan.aggregate({
            where: { companyId },
            _max: { number: true },
        });
        const nextNumber = (aggregate._max.number ?? 0) + 1;

        const plan = await prisma.treatmentPlan.create({
            data: {
                patientId: parseInt(patientId),
                doctorId: parseInt(doctorId),
                companyId,
                branchId,
                number: nextNumber,
                name: name || null,
                discount: parseFloat(discount) || 0,
                notes: notes || null,
                notesPatient: notesPatient || null,
                notesInternal: notesInternal || null,
                items: items && items.length > 0 ? {
                    create: items.map(item => ({
                        serviceId: parseInt(item.serviceId),
                        toothNumber: item.toothNumber || null,
                        price: parseFloat(item.price),
                        quantity: parseInt(item.quantity) || 1,
                        discount: parseFloat(item.discount) || 0,
                        notes: item.notes || null,
                    })),
                } : undefined,
            },
            include: {
                items: { include: { service: true } },
                doctor: { select: { id: true, name: true } },
                patient: { select: { id: true, firstName: true, paternalSurname: true } },
            },
        });
        res.status(201).json(plan);
    } catch (error) {
        console.error('Error createTreatmentPlan:', error);
        res.status(500).json({ message: 'Error al crear plan', detail: error.message });
    }
};

// PATCH /api/treatments/:id — update plan status/notes
const updateTreatmentPlan = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, notes, name, discount, notesPatient, notesInternal } = req.body;
        const companyId = parseInt(req.user.companyId);

        // Fetch current plan to check if it needs a branch repair
        const currentPlan = await prisma.treatmentPlan.findUnique({ where: { id } });
        if (!currentPlan) return res.status(404).json({ message: 'Plan no encontrado' });

        let branchId = req.body.branchId ? parseInt(req.body.branchId) : currentPlan.branchId;

        // Si el plan no tiene branchId (legacy/admin issue), intentamos repararlo con el del usuario o el default
        if (!branchId) {
            branchId = req.user.branchId ? parseInt(req.user.branchId) : null;
            if (!branchId) {
                const firstBranch = await prisma.branch.findFirst({
                    where: { companyId, active: true },
                    orderBy: { id: 'asc' }
                });
                branchId = firstBranch?.id || null;
            }
        }

        const plan = await prisma.treatmentPlan.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                ...(name !== undefined && { name }),
                ...(discount !== undefined && { discount: parseFloat(discount) }),
                ...(notesPatient !== undefined && { notesPatient }),
                ...(notesInternal !== undefined && { notesInternal }),
                ...(branchId && { branchId }),
            },
            include: {
                branch: true, // Incluimos la sede para que el frontend se actualice
                doctor: { select: { id: true, name: true } },
                patient: { select: { id: true, firstName: true, paternalSurname: true } },
                items: { include: { service: true } },
                payments: true,
            }
        });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar plan', detail: error.message });
    }
};

// POST /api/treatments/:id/items — add item to existing plan
const addTreatmentItem = async (req, res) => {
    try {
        const treatmentPlanId = parseInt(req.params.id);
        const { serviceId, toothNumber, price, notes, appointmentId, quantity, discount } = req.body;

        if (!serviceId || price === undefined) {
            return res.status(400).json({ message: 'Campos requeridos: serviceId, price' });
        }

        const item = await prisma.treatmentItem.create({
            data: {
                treatmentPlanId,
                serviceId: parseInt(serviceId),
                toothNumber: toothNumber || null,
                price: parseFloat(price),
                quantity: parseInt(quantity) || 1,
                discount: parseFloat(discount) || 0,
                notes: notes || null,
                appointmentId: appointmentId ? parseInt(appointmentId) : null,
            },
            include: { service: true },
        });
        res.status(201).json(item);
    } catch (error) {
        console.error('Error addTreatmentItem:', error);
        res.status(500).json({ message: 'Error al agregar ítem', detail: error.message });
    }
};

// PATCH /api/treatments/items/:itemId — update item status
const updateTreatmentItem = async (req, res) => {
    try {
        const id = parseInt(req.params.itemId);
        const { status, notes, price, toothNumber, appointmentId, quantity, discount } = req.body;

        // Fetch current item before updating
        const currentItem = await prisma.treatmentItem.findUnique({
            where: { id },
            include: { service: true },
        });
        if (!currentItem) return res.status(404).json({ message: 'Ítem no encontrado' });

        const item = await prisma.treatmentItem.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(quantity !== undefined && { quantity: parseInt(quantity) }),
                ...(discount !== undefined && { discount: parseFloat(discount) }),
                ...(toothNumber !== undefined && { toothNumber }),
                ...(appointmentId !== undefined && { appointmentId: appointmentId ? parseInt(appointmentId) : null }),
            },
            include: { service: true },
        });

        // ── Descuento automático de stock si se marca como COMPLETADO ──────────
        const stockAlerts = [];
        if (status === 'COMPLETED' && currentItem.status !== 'COMPLETED') {
            const qty = parseInt(quantity) || currentItem.quantity || 1;
            const recipe = await prisma.serviceRecipeItem.findMany({
                where: { serviceId: currentItem.serviceId },
                include: { product: true },
            });

            // Necesitamos branchId: lo obtenemos del plan de tratamiento
            let branchId = null;
            if (currentItem.treatmentPlanId) {
                const plan = await prisma.treatmentPlan.findUnique({
                    where: { id: currentItem.treatmentPlanId },
                    select: { branchId: true },
                });
                branchId = plan?.branchId;
            }

            if (recipe.length > 0 && branchId) {
                for (const ingredient of recipe) {
                    const totalQty = ingredient.quantity * qty;

                    // Descontar del stock de la sede
                    const stock = await prisma.inventoryStock.upsert({
                        where: { productId_branchId: { productId: ingredient.productId, branchId } },
                        update: { quantity: { decrement: totalQty } },
                        create: { productId: ingredient.productId, branchId, quantity: -totalQty },
                    });

                    // Registrar movimiento
                    await prisma.inventoryMovement.create({
                        data: {
                            productId: ingredient.productId,
                            branchId,
                            type: 'SALIDA',
                            quantity: totalQty,
                            reason: `Uso en tratamiento: ${item.service?.name || 'Servicio'}`,
                            treatmentItemId: id,
                            createdBy: req.user?.id || 0,
                        },
                    });

                    // Verificar stock mínimo
                    const newQty = stock.quantity;
                    if (ingredient.product.minStock > 0 && newQty <= ingredient.product.minStock) {
                        stockAlerts.push({
                            product: ingredient.product.name,
                            unit: ingredient.product.unit,
                            currentStock: newQty,
                            minStock: ingredient.product.minStock,
                        });
                    }
                }
            }
        }

        res.json({ ...item, stockAlerts });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar ítem', detail: error.message });
    }
};

// DELETE /api/treatments/items/:itemId
const deleteTreatmentItem = async (req, res) => {
    try {
        const id = parseInt(req.params.itemId);
        await prisma.treatmentItem.delete({ where: { id } });
        res.json({ message: 'Ítem eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar ítem', detail: error.message });
    }
};

module.exports = {
    getTreatmentPlans,
    getTreatmentPlanById,
    createTreatmentPlan,
    updateTreatmentPlan,
    addTreatmentItem,
    updateTreatmentItem,
    deleteTreatmentItem,
};

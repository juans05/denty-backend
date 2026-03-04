const prisma = require('../utils/prisma');

// ── Registrar un nuevo egreso ────────────────────────────────────────────────
const createExpense = async (req, res) => {
    try {
        const { type, concept, invoiceRef, paymentMethod, amount, currency, notes, branchId } = req.body;
        const companyId = req.user.companyId;
        const createdBy = req.user.id;

        const expense = await prisma.expense.create({
            data: {
                type,
                concept,
                invoiceRef,
                paymentMethod: paymentMethod || 'EFECTIVO',
                amount: parseFloat(amount),
                currency: currency || 'PEN',
                notes,
                branchId: parseInt(branchId),
                companyId: parseInt(companyId),
                createdBy: parseInt(createdBy),
                status: 'ACTIVE'
            },
            include: {
                creator: { select: { name: true } },
                branch: { select: { name: true } }
            }
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error('[ExpenseController] Error creating expense:', error);
        res.status(500).json({ message: 'Error al registrar el egreso', detail: error.message });
    }
};

// ── Listar egresos con filtros ────────────────────────────────────────────────
const getExpenses = async (req, res) => {
    try {
        const { branchId, startDate, endDate, type, status } = req.query;
        const { companyId, role } = req.user;

        // Filtro base por empresa
        const where = { companyId: parseInt(companyId) };

        // Si no es ADMIN, forzar filtrado por su sede asignada
        if (role !== 'ADMIN') {
            where.branchId = req.user.branchId;
        } else if (branchId) {
            // Si es ADMIN y envía branchId, filtrar por esa sede
            where.branchId = parseInt(branchId);
        }

        if (type) where.type = type;
        if (status) where.status = status;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: {
                creator: { select: { name: true } },
                branch: { select: { name: true } },
                voider: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(expenses);
    } catch (error) {
        console.error('[ExpenseController] Error getting expenses:', error);
        res.status(500).json({ message: 'Error al obtener los egresos', detail: error.message });
    }
};

// ── Anular un egreso ──────────────────────────────────────────────────────────
const voidExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const voidedBy = req.user.id;

        const expense = await prisma.expense.update({
            where: { id: parseInt(id) },
            data: {
                status: 'VOIDED',
                voidedAt: new Date(),
                voidedReason: reason || 'Anulación manual',
                voidedBy: parseInt(voidedBy)
            }
        });

        res.json({ message: 'Egreso anulado correctamente', expense });
    } catch (error) {
        console.error('[ExpenseController] Error voiding expense:', error);
        res.status(500).json({ message: 'Error al anular el egreso', detail: error.message });
    }
};

module.exports = {
    createExpense,
    getExpenses,
    voidExpense
};

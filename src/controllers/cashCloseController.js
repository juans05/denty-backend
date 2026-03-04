const prisma = require('../utils/prisma');

// ── Resumen diario para precierre ───────────────────────────────────────────
const getDailyStatus = async (req, res) => {
    try {
        const { branchId } = req.query;
        const cashierId = req.user.id;
        const companyId = req.user.companyId;

        // Si no es ADMIN, forzar su propia sede
        const targetBranchId = req.user.role === 'ADMIN' ? parseInt(branchId) : req.user.branchId;

        if (!targetBranchId) {
            return res.status(400).json({ message: 'Sede no especificada' });
        }

        // Rango de hoy (00:00 a 23:59)
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        // 1. Ingresos (Pagos registrados hoy por esta cajera en esta sede)
        // Nota: Asumimos que los Payment tienen un campo 'createdBy' o similar. 
        // Si no, usamos 'invoices' creadas por ella hoy.
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId: parseInt(companyId),
                branchId: targetBranchId,
                createdBy: parseInt(cashierId),
                createdAt: { gte: start, lte: end },
                status: 'COMPACT' // O el estado que signifique pagado/activo
            }
        });

        // 2. Egresos (Gastos registrados hoy por esta cajera)
        const expenses = await prisma.expense.findMany({
            where: {
                companyId: parseInt(companyId),
                branchId: targetBranchId,
                createdBy: parseInt(cashierId),
                createdAt: { gte: start, lte: end },
                status: 'ACTIVE'
            }
        });

        const totalIncome = invoices.reduce((acc, inv) => acc + (inv.montoConIgv || 0), 0);
        const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

        // Desglose por método de pago (lógica simplificada, idealmente mirar tabla Payment)
        const summary = {
            totalIncome,
            totalExpenses,
            netBalance: totalIncome - totalExpenses,
            incomeCount: invoices.length,
            expenseCount: expenses.length,
            cashAmount: totalIncome, // TODO: Desglosar correctamente si hay tabla de pagos
            cardAmount: 0,
            transferAmount: 0
        };

        res.json(summary);
    } catch (error) {
        console.error('[CashCloseController] Error getting status:', error);
        res.status(500).json({ message: 'Error al obtener estado de caja', detail: error.message });
    }
};

// ── Ejecutar el cierre de caja ─────────────────────────────────────────────
const performCashClose = async (req, res) => {
    try {
        const { branchId, notes, totals } = req.body;
        const cashierId = req.user.id;
        const companyId = req.user.companyId;

        const close = await prisma.cashClose.create({
            data: {
                date: new Date(),
                branchId: parseInt(branchId),
                companyId: parseInt(companyId),
                closedBy: parseInt(cashierId),
                totalIncome: totals.totalIncome,
                totalExpenses: totals.totalExpenses,
                netBalance: totals.netBalance,
                cashAmount: totals.cashAmount || 0,
                cardAmount: totals.cardAmount || 0,
                transferAmount: totals.transferAmount || 0,
                invoiceCount: totals.incomeCount || 0,
                expenseCount: totals.expenseCount || 0,
                notes
            }
        });

        res.status(201).json(close);
    } catch (error) {
        console.error('[CashCloseController] Error performing close:', error);
        res.status(500).json({ message: 'Error al realizar el cierre', detail: error.message });
    }
};

// ── Historial de cierres ────────────────────────────────────────────────────
const getCashCloseHistory = async (req, res) => {
    try {
        const { branchId } = req.query;
        const { companyId, role } = req.user;

        const where = { companyId: parseInt(companyId) };
        if (role !== 'ADMIN') {
            where.branchId = req.user.branchId;
        } else if (branchId) {
            where.branchId = parseInt(branchId);
        }

        const history = await prisma.cashClose.findMany({
            where,
            include: {
                cashier: { select: { name: true } },
                branch: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(history);
    } catch (error) {
        console.error('[CashCloseController] Error getting history:', error);
        res.status(500).json({ message: 'Error al obtener historial de cierres', detail: error.message });
    }
};

module.exports = {
    getDailyStatus,
    performCashClose,
    getCashCloseHistory
};

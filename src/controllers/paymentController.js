const prisma = require('../utils/prisma');

const createPayment = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { amount, method, reference, treatmentPlanId, appointmentId, branchId } = req.body;
        const createdBy = req.user.id;
        const finalBranchId = branchId ? parseInt(branchId) : (req.user.branchId || null);

        if (!amount) {
            return res.status(400).json({ message: 'El monto es requerido' });
        }

        const payment = await prisma.payment.create({
            data: {
                amount: parseFloat(amount),
                method: method || 'CASH',
                reference,
                treatmentPlanId: treatmentPlanId ? parseInt(treatmentPlanId) : null,
                appointmentId: appointmentId ? parseInt(appointmentId) : null,
                companyId: parseInt(companyId),
                branchId: finalBranchId,
                createdBy: parseInt(createdBy)
            }
        });

        res.status(201).json(payment);
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ message: 'Error al registrar el pago', error: error.message });
    }
};

const getPaymentsByTreatment = async (req, res) => {
    try {
        const { treatmentId } = req.params;
        const payments = await prisma.payment.findMany({
            where: { treatmentPlanId: parseInt(treatmentId) },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ message: 'Error al obtener pagos' });
    }
};

module.exports = {
    createPayment,
    getPaymentsByTreatment
};

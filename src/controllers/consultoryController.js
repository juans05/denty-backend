const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getConsultories = async (req, res) => {
    try {
        const { branchId } = req.query;
        const where = {};
        if (branchId) where.branchId = parseInt(branchId);

        // Ensure the branch belongs to the user's company
        const consultories = await prisma.consultory.findMany({
            where: {
                ...where,
                branch: {
                    companyId: req.user.companyId
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(consultories);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener consultorios', detail: error.message });
    }
};

const createConsultory = async (req, res) => {
    try {
        const { name, branchId } = req.body;

        // Validate branch exists and belongs to company
        const branch = await prisma.branch.findFirst({
            where: { id: branchId, companyId: req.user.companyId }
        });
        if (!branch) return res.status(404).json({ message: 'Sede no encontrada' });

        const consultory = await prisma.consultory.create({
            data: {
                name,
                branchId
            }
        });
        res.json(consultory);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear consultorio', detail: error.message });
    }
};

const updateConsultory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, active } = req.body;

        const consultory = await prisma.consultory.update({
            where: { id: parseInt(id) },
            data: { name, active }
        });
        res.json(consultory);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar consultorio', detail: error.message });
    }
};

module.exports = {
    getConsultories,
    createConsultory,
    updateConsultory
};

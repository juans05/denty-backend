const prisma = require('../utils/prisma');

const getBranches = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        
        console.log(`[BranchController] Fetching branches for companyId: ${companyId}`);
        
        const branches = await prisma.branch.findMany({
            where: { companyId }
        });
        
        console.log(`[BranchController] Found ${branches.length} branches`);
        res.json(branches);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ message: 'Error al obtener sedes', error: error.message });
    }
};

const createBranch = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { name, address, phone } = req.body;

        const branch = await prisma.branch.create({
            data: {
                name,
                address,
                phone,
                companyId
            }
        });

        res.status(201).json(branch);
    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ message: 'Error al crear la sede', error: error.message });
    }
};

const updateBranch = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { id } = req.params;
        const { name, address, phone, active } = req.body;

        const branch = await prisma.branch.update({
            where: {
                id: parseInt(id),
                companyId // Security check
            },
            data: {
                name,
                address,
                phone,
                active
            }
        });

        res.json(branch);
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ message: 'Error al actualizar la sede', error: error.message });
    }
};

const deleteBranch = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { id } = req.params;

        // Logical delete by setting active to false
        await prisma.branch.update({
            where: {
                id: parseInt(id),
                companyId
            },
            data: { active: false }
        });

        res.json({ message: 'Sede desactivada exitosamente' });
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ message: 'Error al eliminar la sede', error: error.message });
    }
};

module.exports = {
    getBranches,
    createBranch,
    updateBranch,
    deleteBranch
};

const prisma = require('../utils/prisma');

const getCompany = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        res.json(company);
    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ message: 'Error al obtener datos de la empresa', error: error.message });
    }
};

const updateCompany = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { name, commercialName, taxId, phone, address, receptionEmail, logo, website, description,
                apisunatPersonaId, apisunatPersonaToken } = req.body;

        const company = await prisma.company.update({
            where: { id: companyId },
            data: {
                ...(name               !== undefined && { name }),
                ...(commercialName     !== undefined && { commercialName }),
                ...(taxId              !== undefined && { taxId }),
                ...(phone              !== undefined && { phone }),
                ...(address            !== undefined && { address }),
                ...(receptionEmail     !== undefined && { receptionEmail }),
                ...(logo               !== undefined && { logo }),
                ...(website            !== undefined && { website }),
                ...(description        !== undefined && { description }),
                ...(apisunatPersonaId  !== undefined && { apisunatPersonaId }),
                ...(apisunatPersonaToken !== undefined && { apisunatPersonaToken }),
            }
        });

        res.json(company);
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ message: 'Error al actualizar datos de la empresa', error: error.message });
    }
};

module.exports = {
    getCompany,
    updateCompany
};

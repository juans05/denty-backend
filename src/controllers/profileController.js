const prisma = require('../utils/prisma');

const getProfiles = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        
        console.log(`[ProfileController] Fetching profiles for companyId: ${companyId}`);
        
        const profiles = await prisma.profile.findMany({
            where: { companyId },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
        
        console.log(`[ProfileController] Found ${profiles.length} profiles`);
        res.json(profiles);
    } catch (error) {
        console.error('[ProfileController] Error fetching profiles:', error);
        res.status(500).json({ message: 'Error al obtener perfiles', error: error.message });
    }
};

module.exports = {
    getProfiles
};

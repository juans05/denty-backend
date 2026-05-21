const prisma = require('../utils/prisma');

const getProfiles = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
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
        res.json(profiles);
    } catch (error) {
        console.error('[ProfileController] Error fetching profiles:', error);
        res.status(500).json({ message: 'Error al obtener perfiles' });
    }
};

const getPermissions = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(permissions);
    } catch (error) {
        console.error('[ProfileController] Error fetching permissions:', error);
        res.status(500).json({ message: 'Error al obtener permisos' });
    }
};

const createProfile = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { name, description, permissionIds } = req.body;

        const profile = await prisma.$transaction(async (tx) => {
            const newProfile = await tx.profile.create({
                data: {
                    name,
                    description,
                    companyId
                }
            });

            if (Array.isArray(permissionIds) && permissionIds.length > 0) {
                await tx.profilePermission.createMany({
                    data: permissionIds.map(pId => ({
                        profileId: newProfile.id,
                        permissionId: parseInt(pId)
                    }))
                });
            }

            return newProfile;
        });

        res.status(201).json(profile);
    } catch (error) {
        console.error('[ProfileController] Error creating profile:', error);
        res.status(500).json({ message: 'Error al crear perfil' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { id } = req.params;
        const { name, description, permissionIds } = req.body;

        const profile = await prisma.$transaction(async (tx) => {
            const updatedProfile = await tx.profile.update({
                where: { id: parseInt(id), companyId },
                data: { name, description }
            });

            if (Array.isArray(permissionIds)) {
                await tx.profilePermission.deleteMany({
                    where: { profileId: parseInt(id) }
                });

                if (permissionIds.length > 0) {
                    await tx.profilePermission.createMany({
                        data: permissionIds.map(pId => ({
                            profileId: parseInt(id),
                            permissionId: parseInt(pId)
                        }))
                    });
                }
            }

            return updatedProfile;
        });

        res.json(profile);
    } catch (error) {
        console.error('[ProfileController] Error updating profile:', error);
        res.status(500).json({ message: 'Error al actualizar perfil' });
    }
};

const deleteProfile = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { id } = req.params;

        // Check if profile is being used by users
        const usersCount = await prisma.user.count({
            where: { profileId: parseInt(id) }
        });

        if (usersCount > 0) {
            return res.status(400).json({ message: 'No se puede eliminar un perfil asignado a usuarios' });
        }

        await prisma.$transaction([
            prisma.profilePermission.deleteMany({ where: { profileId: parseInt(id) } }),
            prisma.profile.delete({ where: { id: parseInt(id), companyId } })
        ]);

        res.json({ message: 'Perfil eliminado correctamente' });
    } catch (error) {
        console.error('[ProfileController] Error deleting profile:', error);
        res.status(500).json({ message: 'Error al eliminar perfil' });
    }
};

module.exports = {
    getProfiles,
    getPermissions,
    createProfile,
    updateProfile,
    deleteProfile
};

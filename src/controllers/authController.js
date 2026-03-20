const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Registro público: crea empresa + usuario admin en una sola transacción ──
const registerCompany = async (req, res) => {
    try {
        const { companyName, taxId, adminName, email, password } = req.body;

        if (!companyName || !taxId || !adminName || !email || !password) {
            return res.status(400).json({ message: 'Campos requeridos: companyName, taxId, adminName, email, password' });
        }

        const [existingTax, existingEmail] = await Promise.all([
            prisma.company.findUnique({ where: { taxId } }),
            prisma.user.findUnique({ where: { email } })
        ]);
        if (existingTax) return res.status(400).json({ message: 'Ya existe una empresa registrada con ese RUC' });
        if (existingEmail) return res.status(400).json({ message: 'El correo ya está en uso' });

        const hashedPassword = await bcrypt.hash(password, 12);

        const { user } = await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: { name: companyName, taxId }
            });

            // ── Crear perfiles por defecto para la nueva empresa ──
            const allPermissions = await tx.permission.findMany();

            // 1. Administrador (todo)
            const adminProfile = await tx.profile.create({
                data: {
                    name: 'ADMINISTRADOR',
                    description: 'Acceso total al sistema',
                    companyId: company.id,
                    permissions: {
                        create: allPermissions.map(p => ({ permission: { connect: { id: p.id } } }))
                    }
                }
            });

            // 2. Odontólogo (clínica + agenda)
            await tx.profile.create({
                data: {
                    name: 'ODONTÓLOGO',
                    description: 'Gestión clínica y agenda',
                    companyId: company.id,
                    permissions: {
                        create: allPermissions
                            .filter(p => !p.key.includes('finance:admin') && !p.key.includes('settings:admin'))
                            .map(p => ({ permission: { connect: { id: p.id } } }))
                    }
                }
            });

            // 3. Recepción (agenda + pacientes)
            await tx.profile.create({
                data: {
                    name: 'RECEPCIÓN',
                    description: 'Agenda y Pacientes básico',
                    companyId: company.id,
                    permissions: {
                        create: allPermissions
                            .filter(p => p.key.startsWith('patients') || p.key.startsWith('agenda') || p.key === 'dash:view')
                            .map(p => ({ permission: { connect: { id: p.id } } }))
                    }
                }
            });

            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: adminName,
                    role: 'ADMIN',
                    companyId: company.id,
                    profileId: adminProfile.id
                }
            });
            return { user };
        });

        const token = jwt.sign(
            { userId: user.id, role: user.role, email: user.email, companyId: user.companyId, branchId: null },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                branchId: null,
                needsSetup: true,
                profile: 'ADMINISTRADOR'
            }
        });
    } catch (error) {
        console.error('Error en registerCompany:', error);
        res.status(500).json({ message: 'Error en el servidor', detail: error.message });
    }
};

const register = async (req, res) => {
    try {
        const { email, password, name, role, branchId, profileId } = req.body;
        // companyId comes from the authenticated token (secure), fallback to body
        const companyId = req.user?.companyId || req.body.companyId;

        console.log('[AuthController] Register attempt:', { email, name, role, branchId, profileId, companyId });

        if (!email || !password || !name || !companyId) {
            console.warn('[AuthController] Missing required fields');
            return res.status(400).json({ message: 'Campos requeridos: email, password, nombre, companyId' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            console.warn(`[AuthController] Email already in use: ${email}`);
            return res.status(400).json({ message: 'El correo ya está en uso por otro usuario' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Buscar perfil por defecto si no se provee profileId
        let finalProfileId = (profileId && profileId !== "") ? parseInt(profileId) : null;
        if (!finalProfileId) {
            const profileName = role === 'ADMIN' ? 'ADMINISTRADOR' : (role === 'RECEPTIONIST' || role === 'ASSISTANT' ? 'RECEPCIÓN' : 'ODONTÓLOGO');
            console.log(`[AuthController] No profileId provided, looking for default: ${profileName} for companyId: ${companyId}`);
            const defaultProfile = await prisma.profile.findFirst({
                where: { name: profileName, companyId: parseInt(companyId) }
            });
            finalProfileId = defaultProfile?.id;
            console.log(`[AuthController] Found default profileId: ${finalProfileId}`);
        }

        const createData = {
            email,
            password: hashedPassword,
            name,
            role: role || 'DENTIST',
            companyId: parseInt(companyId),
            branchId: (branchId && branchId !== "") ? parseInt(branchId) : null,
            profileId: finalProfileId
        };

        console.log('[AuthController] Creating user with data:', createData);

        const user = await prisma.user.create({
            data: createData,
        });

        console.log('[AuthController] User created successfully:', user.id);
        res.status(201).json({ message: 'Usuario creado exitosamente', userId: user.id });
    } catch (error) {
        console.error('[AuthController] Error in register:', error);
        res.status(500).json({ message: 'Error en el servidor', detail: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                profile: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        if (!user.active) {
            return res.status(403).json({ message: 'Usuario desactivado' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                email: user.email,
                companyId: user.companyId,
                branchId: user.branchId
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Detectar si la empresa necesita configuración inicial
        const branchCount = await prisma.branch.count({ where: { companyId: user.companyId } });
        const needsSetup = branchCount === 0;

        const permissions = user.profile?.permissions.map(pp => pp.permission.key) || [];

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                branchId: user.branchId,
                needsSetup,
                profile: user.profile?.name || null,
                permissions: permissions
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

const getUsers = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { role } = req.query;

        const users = await prisma.user.findMany({
            where: {
                companyId,
                role: role ? role : undefined,
                active: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                branchId: true,
                profileId: true,
                profile: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { name, email, role, branchId, profileId, active } = req.body;
        
        const updateData = {
            name,
            email,
            role: role ? role : undefined,
            branchId: branchId ? parseInt(branchId) : (branchId === null ? null : undefined),
            profileId: profileId ? parseInt(profileId) : undefined,
            active,
            updatedAt: new Date()
        };

        if (req.body.password) {
            updateData.password = await bcrypt.hash(req.body.password, 12);
        }

        const user = await prisma.user.update({
            where: {
                id: parseInt(id),
                companyId // Security check
            },
            data: updateData
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        await prisma.user.update({
            where: {
                id: parseInt(id),
                companyId
            },
            data: { active: false }
        });

        res.json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error al eliminar el usuario' });
    }
};

module.exports = {
    registerCompany,
    register,
    login,
    getUsers,
    updateUser,
    deleteUser
};

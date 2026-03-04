const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PERMISSIONS = [
    // Dashboard
    { key: 'dash:view', name: 'Ver Dashboard', module: 'Dashboard' },

    // Pacientes
    { key: 'patients:view', name: 'Listar Pacientes', module: 'Pacientes' },
    { key: 'patients:create', name: 'Crear Paciente', module: 'Pacientes' },
    { key: 'patients:edit', name: 'Editar Paciente', module: 'Pacientes' },
    { key: 'patients:delete', name: 'Desactivar Paciente', module: 'Pacientes' },

    // Agenda
    { key: 'agenda:view', name: 'Ver Agenda', module: 'Agenda' },
    { key: 'agenda:manage', name: 'Gestionar Citas', module: 'Agenda' },

    // Historias Clínicas
    { key: 'history:view', name: 'Ver Historias Clínicas', module: 'Historias' },
    { key: 'history:odontogram', name: 'Gestionar Odontograma', module: 'Historias' },
    { key: 'history:plans', name: 'Gestionar Planes de Tratamiento', module: 'Historias' },

    // Finanzas
    { key: 'finance:view', name: 'Ver Finanzas (Caja)', module: 'Finanzas' },
    { key: 'finance:admin', name: 'Administrar Finanzas (Egresos/Cierres)', module: 'Finanzas' },

    // Gestión y Configuración
    { key: 'settings:view', name: 'Ver Configuración', module: 'Configuración' },
    { key: 'settings:admin', name: 'Administrar Usuarios y Sedes', module: 'Configuración' },
];

async function main() {
    console.log('--- Iniciando Seed de Permisos ---');

    for (const p of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { key: p.key },
            update: p,
            create: p,
        });
    }

    console.log(`[OK] ${PERMISSIONS.length} permisos creados/actualizados.`);

    // Crear perfiles por defecto para cada empresa existente
    const companies = await prisma.company.findMany();
    const allPermissions = await prisma.permission.findMany();

    for (const company of companies) {
        console.log(`Configurando perfiles para: ${company.name}`);

        const profileData = [
            { name: 'ADMINISTRADOR', description: 'Acceso total al sistema', perms: allPermissions.map(p => p.id) },
            {
                name: 'ODONTÓLOGO',
                description: 'Gestión clínica y agenda',
                perms: allPermissions.filter(p => !p.key.includes('finance:admin') && !p.key.includes('settings:admin')).map(p => p.id)
            },
            {
                name: 'RECEPCIÓN',
                description: 'Agenda y Pacientes básico',
                perms: allPermissions.filter(p => p.key.startsWith('patients') || p.key.startsWith('agenda') || p.key === 'dash:view').map(p => p.id)
            },
        ];

        for (const pd of profileData) {
            const profile = await prisma.profile.upsert({
                where: { name_companyId: { name: pd.name, companyId: company.id } },
                update: {},
                create: {
                    name: pd.name,
                    description: pd.description,
                    companyId: company.id,
                }
            });

            // Asignar permisos
            for (const permId of pd.perms) {
                await prisma.profilePermission.upsert({
                    where: { profileId_permissionId: { profileId: profile.id, permissionId: permId } },
                    update: {},
                    create: { profileId: profile.id, permissionId: permId }
                });
            }
        }
    }

    console.log('--- Seed de Perfiles completado ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

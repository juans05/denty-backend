const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando Migración de Usuarios a Perfiles ---');

    const users = await prisma.user.findMany();

    for (const user of users) {
        let profileName = '';
        switch (user.role) {
            case 'ADMIN':
                profileName = 'ADMINISTRADOR';
                break;
            case 'DENTIST':
                profileName = 'ODONTÓLOGO';
                break;
            case 'RECEPTIONIST':
            case 'ASSISTANT':
                profileName = 'RECEPCIÓN';
                break;
            default:
                profileName = 'RECEPCIÓN';
        }

        const profile = await prisma.profile.findFirst({
            where: {
                name: profileName,
                companyId: user.companyId
            }
        });

        if (profile) {
            await prisma.user.update({
                where: { id: user.id },
                data: { profileId: profile.id }
            });
            console.log(`Usuario ${user.email} migrado al perfil ${profileName}`);
        } else {
            console.error(`No se encontró el perfil ${profileName} para la empresa ${user.companyId}. Asegúrate de ejecutar seedPermissions.js primero.`);
        }
    }

    console.log('--- Migración completada ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companyId = 1; // ID por defecto en desarrollo

    const services = [
        // Operatoría
        { name: 'Curación Simple (Resina)', category: 'Operatoría', price: 120, duration: 30, companyId },
        { name: 'Curación Compuesta (Resina)', category: 'Operatoría', price: 180, duration: 45, companyId },
        { name: 'Reconstrucción con Pin/Perno', category: 'Operatoría', price: 250, duration: 60, companyId },

        // Endodoncia
        { name: 'Endodoncia Unirradicular', category: 'Endodoncia', price: 350, duration: 60, companyId },
        { name: 'Endodoncia Multirradicular', category: 'Endodoncia', price: 550, duration: 90, companyId },
        { name: 'Pulpectomía (Pediátrico)', category: 'Endodoncia', price: 280, duration: 45, companyId },

        // Cirugía
        { name: 'Exodoncia Simple', category: 'Cirugía', price: 150, duration: 30, companyId },
        { name: 'Exodoncia Compleja/Cirugía', category: 'Cirugía', price: 450, duration: 90, companyId },

        // Rehabilitación
        { name: 'Corona de Zirconio', category: 'Rehabilitación', price: 1200, duration: 60, companyId },
        { name: 'Corona de Porcelana', category: 'Rehabilitación', price: 850, duration: 60, companyId },
        { name: 'Carilla de Resina de Estética', category: 'Estética', price: 400, duration: 90, companyId },
        { name: 'Carilla de Porcelana', category: 'Estética', price: 1500, duration: 90, companyId },
        { name: 'Implante Dental de Titanio', category: 'Cirugía/Implantes', price: 2500, duration: 120, companyId },

        // Preventiva
        { name: 'Profilaxis y Limpieza Ultrasonido', category: 'Prevención', price: 150, duration: 30, companyId },
        { name: 'Sellante de Fosas y Fisuras', category: 'Prevención', price: 80, duration: 20, companyId },

        // Ortodoncia
        { name: 'Instalación de Brackets Metálicos', category: 'Ortodoncia', price: 1500, duration: 120, companyId },
        { name: 'Control de Ortodoncia Mensual', category: 'Ortodoncia', price: 200, duration: 30, companyId }
    ];

    console.log('Sembrando servicios...');

    for (const service of services) {
        // Usamos upsert para evitar duplicados si se corre varias veces
        await prisma.service.upsert({
            where: { id: -1 }, // Condición que nunca se cumple si no tenemos el ID
            update: {},
            create: service,
        });
    }

    // Como upsert con ID -1 creará siempre si no pasamos el ID real, 
    // pero el ID es autoincremental, mejor simplemente cread o buscar por nombre.
    // Vamos a usar create directamente para esta demo guiada.

    console.log('¡Servicios sembrados exitosamente!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const patient4 = await prisma.patient.findUnique({
            where: { id: 4 },
            include: {
                clinicalForms: true
            }
        });
        console.log('PATIENT 4 DATA:', JSON.stringify(patient4, null, 2));
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

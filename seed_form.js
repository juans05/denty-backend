const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const form = await prisma.clinicalForm.upsert({
            where: {
                patientId_type: {
                    patientId: 4,
                    type: 'ADULT_ANAMNESIS'
                }
            },
            update: {
                data: { consultationReason: 'TEST DATA - DOLOR EN MOLAR', signs: 'INFLAMACIÓN' },
                doctorId: 1,
                updatedAt: new Date()
            },
            create: {
                patientId: 4,
                type: 'ADULT_ANAMNESIS',
                data: { consultationReason: 'TEST DATA - DOLOR EN MOLAR', signs: 'INFLAMACIÓN' },
                doctorId: 1
            }
        });
        console.log('FORM CREATED/UPDATED:', JSON.stringify(form, null, 2));
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

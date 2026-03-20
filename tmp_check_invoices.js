const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            number: true,
            apisunatStatus: true,
            apisunatResponse: true,
            createdAt: true
        }
    });
    console.log(JSON.stringify(invoices, null, 2));
}

main().finally(() => prisma.$disconnect());

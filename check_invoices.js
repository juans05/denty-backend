const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.invoice.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            number: true,
            serie: true,
            correlativo: true,
            companyId: true,
            createdAt: true
        }
    });

    console.log('Last 10 Invoices:');
    console.table(invoices);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });

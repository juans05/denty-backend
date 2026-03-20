const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const branches = await prisma.branch.findMany({
        select: {
            id: true,
            name: true,
            seriesBoleta: true,
            seriesFactura: true,
            companyId: true
        }
    });

    console.log('Branches Series Configuration:');
    console.table(branches);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });

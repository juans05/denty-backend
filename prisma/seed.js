const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    // 1. Create Default Company
    const company = await prisma.company.upsert({
        where: { taxId: '20123456789' },
        update: {},
        create: {
            name: 'Clínica Dental Principal',
            taxId: '20123456789',
        },
    });

    // 2. Create Default Branch
    const branch = await prisma.branch.upsert({
        where: { id: 1 }, // Using ID 1 for initial seed
        update: {},
        create: {
            name: 'Sede Central',
            address: 'Av. Principal 123',
            companyId: company.id,
        },
    });

    // 3. Create/Update Admin User
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@dental.com' },
        update: {
            companyId: company.id,
            branchId: branch.id,
        },
        create: {
            email: 'admin@dental.com',
            name: 'Administrador Principal',
            password: hashedPassword,
            role: 'ADMIN',
            companyId: company.id,
            branchId: branch.id,
        },
    });

    console.log('Seed base completado:', { company: company.name, branch: branch.name, admin: admin.email });

    // 4. Seed del catálogo de servicios dentales
    await prisma.$disconnect();
    execSync(`node ${path.join(__dirname, 'seedServices.js')}`, { stdio: 'inherit' });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });

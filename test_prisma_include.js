const axios = require('axios');

async function testApi() {
  try {
    // We need a token or we can just mock the Prisma call in a script
    console.log('Testing manual prisma include for Plan 7...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const plan = await prisma.treatmentPlan.findUnique({
      where: { id: 7 },
      include: {
        invoices: {
          include: {
            items: true,
            company: true,
            branch: true
          }
        }
      }
    });
    
    console.log('Plan 7 Invoices:', JSON.stringify(plan.invoices, null, 2));
    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
  }
}

testApi();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const plans = await prisma.treatmentPlan.findMany({
      include: {
        invoices: true,
        items: true
      }
    });
    
    console.log('Total plans:', plans.length);
    plans.forEach(p => {
      console.log(`Plan ID: ${p.id}, Name: ${p.name}, Invoices count: ${p.invoices.length}`);
      if (p.invoices.length === 0) {
        const invoicedItems = p.items.filter(i => i.status === 'INVOICED');
        if (invoicedItems.length > 0) {
          console.log(`  WARNING: Plan has ${invoicedItems.length} invoiced items but 0 invoice records.`);
        }
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();

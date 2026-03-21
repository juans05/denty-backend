const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepCheck() {
  try {
    const planId = 7;
    console.log(`Deep checking Plan ID: ${planId}`);
    
    // 1. Direct relation
    const plan = await prisma.treatmentPlan.findUnique({
      where: { id: planId },
      include: { invoices: true, items: true }
    });
    
    console.log(`Direct Invoices linked: ${plan.invoices.length}`);
    if (plan.invoices.length > 0) {
        plan.invoices.forEach(inv => {
            console.log(` - Linked Invoice: ID ${inv.id}, Number ${inv.number}`);
        });
    }
    
    // 2. Relation via items
    const itemIds = plan.items.map(i => i.id);
    const treatmentItems = await prisma.treatmentItem.findMany({
      where: { id: { in: itemIds }, NOT: { invoiceId: null } },
      include: { invoice: true }
    });
    
    const uniqueInvoiceIds = [...new Set(treatmentItems.map(ii => ii.invoiceId))];
    console.log(`Invoices found via items: ${uniqueInvoiceIds.length}`);
    uniqueInvoiceIds.forEach(id => {
       const inv = treatmentItems.find(ii => ii.invoiceId === id).invoice;
       console.log(` - Invoice via Items: ID ${id}, Number ${inv.number}, treatmentPlanId field: ${inv.treatmentPlanId}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

deepCheck();

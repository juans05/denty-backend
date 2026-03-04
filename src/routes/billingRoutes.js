const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const paymentController = require('../controllers/paymentController');
const expenseController = require('../controllers/expenseController');
const cashCloseController = require('../controllers/cashCloseController');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// ── Invoices ────────────────────────────────────────────────────────────────
router.post('/invoices', invoiceController.createInvoice);
router.get('/invoices', invoiceController.getInvoices);
router.get('/invoices/:id', invoiceController.getInvoiceById);
router.post('/invoices/:id/void', invoiceController.voidInvoice);
router.post('/invoices/:id/credit-note', invoiceController.createCreditNote);
router.get('/patient/:patientId/statement', invoiceController.getPatientStatement);

// ── Invoice Series (configuración por sede) ──────────────────────────────────
router.get('/invoice-series', invoiceController.getInvoiceSeries);
router.post('/invoice-series', invoiceController.upsertInvoiceSerie);
router.delete('/invoice-series/:id', invoiceController.deleteInvoiceSerie);

// ── Payments ────────────────────────────────────────────────────────────────
router.post('/payments', paymentController.createPayment);
router.get('/payments/treatment/:treatmentId', paymentController.getPaymentsByTreatment);

// ── Expenses ────────────────────────────────────────────────────────────────
router.post('/expenses', expenseController.createExpense);
router.get('/expenses', expenseController.getExpenses);
router.post('/expenses/:id/void', expenseController.voidExpense);

// ── Cash Closing ────────────────────────────────────────────────────────────
router.get('/cash-close/status', cashCloseController.getDailyStatus);
router.post('/cash-close', cashCloseController.performCashClose);
router.get('/cash-close/history', cashCloseController.getCashCloseHistory);

// ── Reports & Exports ───────────────────────────────────────────────────────
router.get('/reports/financial', reportController.getFinancialReportData);
router.get('/reports/export/pdf', reportController.exportPDF);
router.get('/reports/export/excel', reportController.exportExcel);

module.exports = router;

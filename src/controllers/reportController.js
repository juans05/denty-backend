const prisma = require('../utils/prisma');
const jsPDF = require('jspdf').jsPDF;
require('jspdf-autotable');
const ExcelJS = require('exceljs');

// ── Obtener datos agrupados Ingresos/Egresos ─────────────────────────────────
const getFinancialReportData = async (req, res) => {
    try {
        const { branchId, startDate, endDate } = req.query;
        const { companyId, role } = req.user;

        const where = { companyId: parseInt(companyId), status: 'ACTIVE' };
        const whereInv = { companyId: parseInt(companyId) }; // Invoices

        if (role !== 'ADMIN') {
            where.branchId = req.user.branchId;
            whereInv.branchId = req.user.branchId;
        } else if (branchId) {
            where.branchId = parseInt(branchId);
            whereInv.branchId = parseInt(branchId);
        }

        if (startDate || endDate) {
            const dateRange = {};
            if (startDate) dateRange.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateRange.lte = end;
            }
            where.createdAt = dateRange;
            whereInv.createdAt = dateRange;
        }

        const [expenses, invoices] = await Promise.all([
            prisma.expense.findMany({ where, include: { branch: true, creator: true } }),
            prisma.invoice.findMany({ where: whereInv, include: { branch: true } })
        ]);

        const totalIncome = invoices.reduce((acc, inv) => acc + (inv.montoConIgv || 0), 0);
        const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

        return {
            expenses,
            invoices,
            summary: {
                totalIncome,
                totalExpenses,
                netBalance: totalIncome - totalExpenses,
                period: `${startDate || 'Inicio'} a ${endDate || 'Hoy'}`
            }
        };
    } catch (error) {
        throw error;
    }
};

// ── Exportar PDF ─────────────────────────────────────────────────────────────
const exportPDF = async (req, res) => {
    try {
        const data = await getFinancialReportData(req, res);
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Reporte Financiero Dental', 14, 20);
        doc.setFontSize(10);
        doc.text(`Periodo: ${data.summary.period}`, 14, 30);
        doc.text(`Balance Neto: S/ ${data.summary.netBalance.toFixed(2)}`, 14, 35);

        // Agregando tabla de ingresos
        doc.text('INGRESOS (Facturas/Boletas)', 14, 50);
        const incomeRows = data.invoices.map(inv => [
            new Date(inv.createdAt).toLocaleDateString(),
            inv.type,
            inv.serie + '-' + inv.correlativo || 'N/A',
            inv.razonSocial || 'Paciente',
            inv.montoConIgv.toFixed(2)
        ]);
        doc.autoTable({
            startY: 55,
            head: [['Fecha', 'Tipo', 'Documento', 'Cliente', 'Monto']],
            body: incomeRows,
        });

        // Agregando tabla de egresos
        const nextY = doc.lastAutoTable.finalY + 15;
        doc.text('EGRESOS (Gastos)', 14, nextY);
        const expenseRows = data.expenses.map(exp => [
            new Date(exp.createdAt).toLocaleDateString(),
            exp.type,
            exp.concept,
            exp.paymentMethod,
            exp.amount.toFixed(2)
        ]);
        doc.autoTable({
            startY: nextY + 5,
            head: [['Fecha', 'Tipo', 'Concepto', 'Método', 'Monto']],
            body: expenseRows,
        });

        const pdfBase64 = doc.output('datauristring');
        res.json({ pdf: pdfBase64 });
    } catch (error) {
        res.status(500).json({ message: 'Error al generar PDF', detail: error.message });
    }
};

// ── Exportar Excel ───────────────────────────────────────────────────────────
const exportExcel = async (req, res) => {
    try {
        const data = await getFinancialReportData(req, res);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reporte Financiero');

        sheet.addRow(['Reporte Financiero Dental']);
        sheet.addRow(['Periodo:', data.summary.period]);
        sheet.addRow(['Balance Neto:', data.summary.netBalance]);
        sheet.addRow([]);

        sheet.addRow(['INGRESOS']);
        sheet.addRow(['Fecha', 'Tipo', 'Documento', 'Cliente', 'Monto']);
        data.invoices.forEach(inv => {
            sheet.addRow([new Date(inv.createdAt), inv.type, inv.serie + '-' + (inv.correlativo || ''), inv.razonSocial, inv.montoConIgv]);
        });

        sheet.addRow([]);
        sheet.addRow(['EGRESOS']);
        sheet.addRow(['Fecha', 'Tipo', 'Concepto', 'Método', 'Monto']);
        data.expenses.forEach(exp => {
            sheet.addRow([new Date(exp.createdAt), exp.type, exp.concept, exp.paymentMethod, exp.amount]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_financiero.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: 'Error al generar Excel', detail: error.message });
    }
};

module.exports = {
    exportPDF,
    exportExcel,
    getFinancialReportData: async (req, res) => res.json(await getFinancialReportData(req, res))
};

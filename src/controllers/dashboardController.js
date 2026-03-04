const prisma = require('../utils/prisma');

const getStats = async (req, res) => {
    try {
        const { companyId } = req.user;
        const id = parseInt(companyId);

        // ── Rangos de fechas ────────────────────────────────────────────────
        const now = new Date();

        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // ── Queries en paralelo ─────────────────────────────────────────────
        const [
            totalPatients,
            prevMonthPatients,
            todayCount,
            monthAppCount,
            prevMonthAppCount,
            upcomingAppointments,
            revenueThisMonth,
            revenueLastMonth,
            pendingPlansCount,
        ] = await Promise.all([

            // 1. Total pacientes activos
            prisma.patient.count({ where: { companyId: id, active: true } }),

            // 2. Pacientes nuevos mes anterior (para trend)
            prisma.patient.count({
                where: { companyId: id, active: true, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } }
            }),

            // 3. Citas de hoy
            prisma.appointment.count({
                where: { branch: { companyId: id }, date: { gte: todayStart, lte: todayEnd } }
            }),

            // 4. Citas este mes
            prisma.appointment.count({
                where: { branch: { companyId: id }, date: { gte: monthStart, lte: monthEnd } }
            }),

            // 5. Citas mes anterior
            prisma.appointment.count({
                where: { branch: { companyId: id }, date: { gte: prevMonthStart, lte: prevMonthEnd } }
            }),

            // 6. Próximas citas (hoy en adelante, máx 8)
            prisma.appointment.findMany({
                where: {
                    branch: { companyId: id },
                    date: { gte: todayStart },
                    status: { not: 'CANCELLED' }
                },
                orderBy: { date: 'asc' },
                take: 8,
                include: {
                    patient: { select: { id: true, firstName: true, paternalSurname: true } },
                    doctor:  { select: { id: true, name: true } },
                    branch:  { select: { id: true, name: true } }
                }
            }),

            // 7. Ingresos este mes (suma de pagos)
            prisma.payment.aggregate({
                where: { companyId: id, createdAt: { gte: monthStart, lte: monthEnd } },
                _sum: { amount: true }
            }),

            // 8. Ingresos mes anterior
            prisma.payment.aggregate({
                where: { companyId: id, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
                _sum: { amount: true }
            }),

            // 9. Planes con pago pendiente o parcial
            prisma.treatmentPlan.count({
                where: {
                    doctor: { companyId: id },
                    status: { in: ['PENDING_PAYMENT', 'PARTIAL_PAYMENT'] }
                }
            }),
        ]);

        // ── Calcular trends ─────────────────────────────────────────────────
        const monthRevenue  = revenueThisMonth._sum.amount  || 0;
        const prevRevenue   = revenueLastMonth._sum.amount  || 0;
        const revenueTrend  = prevRevenue > 0
            ? `${monthRevenue >= prevRevenue ? '+' : ''}${Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100)}%`
            : null;

        const appTrend = prevMonthAppCount > 0
            ? `${monthAppCount >= prevMonthAppCount ? '+' : ''}${Math.round(((monthAppCount - prevMonthAppCount) / prevMonthAppCount) * 100)}%`
            : null;

        // Trend de pacientes: nuevos este mes vs mes anterior
        const newPatientsThisMonth = await prisma.patient.count({
            where: { companyId: id, active: true, createdAt: { gte: monthStart, lte: monthEnd } }
        });
        const patientTrend = prevMonthPatients > 0
            ? `${newPatientsThisMonth >= prevMonthPatients ? '+' : ''}${Math.round(((newPatientsThisMonth - prevMonthPatients) / prevMonthPatients) * 100)}%`
            : newPatientsThisMonth > 0 ? `+${newPatientsThisMonth}` : null;

        // ── Respuesta ────────────────────────────────────────────────────────
        res.json({
            totalPatients,
            patientTrend,
            todayAppointments: todayCount,
            monthAppointments: monthAppCount,
            appTrend,
            monthlyRevenue: parseFloat(monthRevenue.toFixed(2)),
            revenueTrend,
            pendingPaymentPlans: pendingPlansCount,
            upcomingAppointments: upcomingAppointments.map(a => ({
                id: a.id,
                date: a.date,
                status: a.status,
                reason: a.reason,
                duration: a.duration,
                patientName: [a.patient?.firstName, a.patient?.paternalSurname].filter(Boolean).join(' '),
                patientId: a.patient?.id,
                doctorName: a.doctor?.name,
                branchName: a.branch?.name
            }))
        });

    } catch (error) {
        console.error('Error getStats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas', detail: error.message });
    }
};

module.exports = { getStats };

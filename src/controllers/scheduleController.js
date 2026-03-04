const prisma = require('../utils/prisma');

// ── GET /api/schedule?doctorId=X&branchId=X ─────────────────────────────────
// Devuelve el horario semanal de un médico en una sede (los 7 días)
const getSchedule = async (req, res) => {
    try {
        const { doctorId, branchId } = req.query;
        if (!doctorId || !branchId) {
            return res.status(400).json({ message: 'Se requiere doctorId y branchId' });
        }

        const schedules = await prisma.doctorSchedule.findMany({
            where: { doctorId: parseInt(doctorId), branchId: parseInt(branchId) },
            orderBy: { dayOfWeek: 'asc' }
        });

        // Devolver los 7 días aunque no tengan configuración
        const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const result = Array.from({ length: 7 }, (_, i) => {
            const existing = schedules.find(s => s.dayOfWeek === i);
            return existing || {
                doctorId: parseInt(doctorId),
                branchId: parseInt(branchId),
                dayOfWeek: i,
                startTime: '08:00',
                endTime: '18:00',
                active: i !== 0, // Domingo inactivo por defecto
                dayName: DAY_NAMES[i]
            };
        }).map(s => ({ ...s, dayName: DAY_NAMES[s.dayOfWeek] }));

        res.json(result);
    } catch (error) {
        console.error('Error getSchedule:', error);
        res.status(500).json({ message: 'Error al obtener horario', detail: error.message });
    }
};

// ── POST /api/schedule ────────────────────────────────────────────────────────
// Guarda/actualiza el horario semanal completo de un médico
// Body: { doctorId, branchId, days: [{ dayOfWeek, startTime, endTime, active }] }
const upsertSchedule = async (req, res) => {
    try {
        const { doctorId, branchId, days } = req.body;

        if (!doctorId || !branchId || !Array.isArray(days)) {
            return res.status(400).json({ message: 'Se requiere doctorId, branchId y days[]' });
        }

        const operations = days.map(day =>
            prisma.doctorSchedule.upsert({
                where: {
                    doctorId_branchId_dayOfWeek: {
                        doctorId: parseInt(doctorId),
                        branchId: parseInt(branchId),
                        dayOfWeek: day.dayOfWeek
                    }
                },
                update: {
                    startTime: day.startTime,
                    endTime: day.endTime,
                    active: day.active,
                    updatedAt: new Date()
                },
                create: {
                    doctorId: parseInt(doctorId),
                    branchId: parseInt(branchId),
                    dayOfWeek: day.dayOfWeek,
                    startTime: day.startTime || '08:00',
                    endTime: day.endTime || '18:00',
                    active: day.active !== undefined ? day.active : true
                }
            })
        );

        const saved = await prisma.$transaction(operations);
        res.json({ message: 'Horario guardado', count: saved.length });
    } catch (error) {
        console.error('Error upsertSchedule:', error);
        res.status(500).json({ message: 'Error al guardar horario', detail: error.message });
    }
};

// ── GET /api/schedule/blocked?branchId=X&doctorId=X&from=ISO&to=ISO ──────────
const getBlockedSlots = async (req, res) => {
    try {
        const { branchId, doctorId, from, to } = req.query;
        if (!branchId) return res.status(400).json({ message: 'Se requiere branchId' });

        const where = { branchId: parseInt(branchId) };
        if (doctorId) where.doctorId = parseInt(doctorId);
        if (from || to) {
            where.startAt = {};
            if (from) where.startAt.gte = new Date(from);
            if (to)   where.endAt = { lte: new Date(to) };
        }

        const slots = await prisma.blockedSlot.findMany({
            where,
            include: {
                doctor:  { select: { id: true, name: true } },
                creator: { select: { id: true, name: true } }
            },
            orderBy: { startAt: 'asc' }
        });

        res.json(slots);
    } catch (error) {
        console.error('Error getBlockedSlots:', error);
        res.status(500).json({ message: 'Error al obtener bloqueos', detail: error.message });
    }
};

// ── POST /api/schedule/blocked ────────────────────────────────────────────────
const createBlockedSlot = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const { doctorId, branchId, startAt, endAt, reason } = req.body;

        if (!branchId || !startAt || !endAt) {
            return res.status(400).json({ message: 'Se requiere branchId, startAt y endAt' });
        }

        const start = new Date(startAt);
        const end   = new Date(endAt);

        if (start >= end) {
            return res.status(400).json({ message: 'La fecha de inicio debe ser anterior a la de fin' });
        }

        const slot = await prisma.blockedSlot.create({
            data: {
                doctorId: doctorId ? parseInt(doctorId) : null,
                branchId: parseInt(branchId),
                startAt: start,
                endAt: end,
                reason: reason || null,
                createdBy
            },
            include: {
                doctor:  { select: { id: true, name: true } },
                creator: { select: { id: true, name: true } }
            }
        });

        res.status(201).json(slot);
    } catch (error) {
        console.error('Error createBlockedSlot:', error);
        res.status(500).json({ message: 'Error al crear bloqueo', detail: error.message });
    }
};

// ── DELETE /api/schedule/blocked/:id ─────────────────────────────────────────
const deleteBlockedSlot = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.blockedSlot.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Bloqueo eliminado' });
    } catch (error) {
        console.error('Error deleteBlockedSlot:', error);
        res.status(500).json({ message: 'Error al eliminar bloqueo', detail: error.message });
    }
};

module.exports = { getSchedule, upsertSchedule, getBlockedSlots, createBlockedSlot, deleteBlockedSlot };

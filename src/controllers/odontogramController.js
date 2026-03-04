const prisma = require('../utils/prisma');

// GET /api/odontograms/:patientId — get all odontograms for patient (sorted newest first)
const getOdontogram = async (req, res) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const companyId = parseInt(req.user.companyId);

        const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });

        // Return ALL odontograms sorted newest first
        const odontograms = await prisma.odontogram.findMany({
            where: { patientId },
            orderBy: { visitDate: 'desc' },
        });

        // For backwards compatibility, also return "current" as the latest one
        res.json({ all: odontograms, current: odontograms[0] || null });
    } catch (error) {
        console.error('Error getOdontogram:', error);
        res.status(500).json({ message: 'Error al obtener odontograma', detail: error.message });
    }
};

// POST /api/odontograms/:patientId/new — create a brand new visit odontogram
const createNewVisit = async (req, res) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const companyId = parseInt(req.user.companyId);
        const doctorId = parseInt(req.user.id || req.user.userId);
        const { sessionNotes, visitDate } = req.body;

        const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });

        const odontogram = await prisma.odontogram.create({
            data: {
                patientId,
                doctorId: !isNaN(doctorId) ? doctorId : undefined,
                data: {},
                visitDate: visitDate ? new Date(visitDate) : new Date(),
                sessionNotes: sessionNotes || null,
            }
        });

        res.status(201).json(odontogram);
    } catch (error) {
        console.error('Error createNewVisit:', error);
        res.status(500).json({ message: 'Error al crear nueva visita', detail: error.message });
    }
};

// PUT /api/odontograms/:patientId — update the CURRENT (latest) odontogram for patient
const saveOdontogram = async (req, res) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const companyId = parseInt(req.user.companyId);
        const doctorId = parseInt(req.user.id || req.user.userId);
        const { data, logs, sessionNotes, odontogramId } = req.body;

        if (isNaN(doctorId)) {
            return res.status(403).json({ message: 'Sesión inválida: No se pudo identificar al odontólogo.' });
        }
        if (!data) return res.status(400).json({ message: 'Se requiere el campo data' });

        const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });

        let odontogram;

        if (odontogramId) {
            // Update a specific odontogram by ID
            odontogram = await prisma.odontogram.update({
                where: { id: parseInt(odontogramId) },
                data: { data, ...(sessionNotes !== undefined && { sessionNotes }) },
            });
        } else {
            // Upsert: find the most recent one or create new
            const existing = await prisma.odontogram.findFirst({
                where: { patientId },
                orderBy: { visitDate: 'desc' },
            });

            if (existing) {
                odontogram = await prisma.odontogram.update({
                    where: { id: existing.id },
                    data: { data, ...(sessionNotes !== undefined && { sessionNotes }) },
                });
            } else {
                odontogram = await prisma.odontogram.create({
                    data: {
                        patientId,
                        doctorId: !isNaN(doctorId) ? doctorId : undefined,
                        data,
                        sessionNotes: sessionNotes || null,
                    }
                });
            }
        }

        // Process logs if any
        if (logs && Array.isArray(logs) && logs.length > 0) {
            try {
                await prisma.odontogramLog.createMany({
                    data: logs.map((log, index) => {
                        if (!log.toothNumber) {
                            console.warn(`[saveOdontogram] Log at index ${index} missing toothNumber:`, log);
                        }
                        return {
                            patientId,
                            toothNumber: (log.toothNumber || '0').toString(),
                            conditionId: log.conditionId || null,
                            action: log.action || 'UNKNOWN',
                            description: log.description || null,
                            doctorId: !isNaN(doctorId) ? doctorId : undefined,
                        };
                    })
                });
            } catch (logError) {
                console.error('Error saving odontogram logs:', logError);
            }
        }

        res.json(odontogram);
    } catch (error) {
        console.error('CRITICAL ERROR saveOdontogram:', error);
        res.status(500).json({ message: 'Error al guardar odontograma', detail: error.message });
    }
};

const getToothHistory = async (req, res) => {
    try {
        const { patientId, toothNumber } = req.params;
        const history = await prisma.odontogramLog.findMany({
            where: {
                patientId: parseInt(patientId),
                toothNumber: toothNumber.toString(),
            },
            include: {
                doctor: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener historial', detail: error.message });
    }
};

// DELETE /api/odontograms/:patientId/reset — clear all findings
const resetOdontogram = async (req, res) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const companyId = parseInt(req.user.companyId);

        const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });

        await prisma.odontogram.deleteMany({ where: { patientId } });
        res.json({ message: 'Odontograma reiniciado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al reiniciar odontograma', detail: error.message });
    }
};

module.exports = { getOdontogram, saveOdontogram, resetOdontogram, getToothHistory, createNewVisit };

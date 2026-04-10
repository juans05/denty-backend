const prisma = require('../utils/prisma');

const getProfile = async (req, res) => {
    try {
        const { patientId } = req.user;
        if (!patientId) return res.status(403).json({ message: 'No es un perfil de paciente' });

        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                company: {
                    select: { name: true, logo: true, phone: true, address: true }
                }
            }
        });

        res.json(patient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
};

const getMyAppointments = async (req, res) => {
    try {
        const { patientId } = req.user;
        const appointments = await prisma.appointment.findMany({
            where: { patientId },
            include: {
                doctor: { select: { name: true } },
                branch: { select: { name: true, address: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener citas' });
    }
};

const getMyTreatments = async (req, res) => {
    try {
        const { patientId } = req.user;
        const treatments = await prisma.treatmentPlan.findMany({
            where: { patientId },
            include: {
                items: {
                    include: { service: true }
                },
                doctor: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(treatments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener tratamientos' });
    }
};

const getMyDocuments = async (req, res) => {
    try {
        const { patientId } = req.user;
        const [consents, files] = await Promise.all([
            prisma.patientConsent.findMany({
                where: { patientId, signed: true },
                orderBy: { signedAt: 'desc' }
            }),
            prisma.patientFile.findMany({
                where: { patientId },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        res.json({ consents, files });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener documentos' });
    }
};

const updateFcmToken = async (req, res) => {
    try {
        const { patientId } = req.user;
        const { fcmToken } = req.body;

        if (!patientId) return res.status(403).json({ message: 'No es un perfil de paciente' });
        if (!fcmToken) return res.status(400).json({ message: 'Token FCM requerido' });

        await prisma.patient.update({
            where: { id: patientId },
            data: { fcmToken }
        });

        res.json({ message: 'Token FCM de paciente actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar fcmToken paciente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const getAvailableDoctors = async (req, res) => {
    try {
        const { companyId } = req.user;
        const doctors = await prisma.user.findMany({
            where: { 
                companyId: parseInt(companyId),
                role: 'DENTIST',
                active: true
            },
            select: { id: true, name: true, email: true, role: true }
        });
        res.json(doctors);
    } catch (error) {
        console.error('Error al obtener doctores:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const getAvailability = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        if (!doctorId || !date) {
            return res.status(400).json({ message: 'doctorId y date son requeridos' });
        }

        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay(); // 0-6 (Sun-Sat)

        const schedule = await prisma.doctorSchedule.findFirst({
            where: { 
                doctorId: parseInt(doctorId),
                dayOfWeek: dayOfWeek
            }
        });

        if (!schedule || !schedule.startTime || !schedule.endTime) {
            return res.json([]); 
        }

        const dayStart = new Date(targetDate);
        dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23,59,59,999);

        const appointments = await prisma.appointment.findMany({
            where: {
                doctorId: parseInt(doctorId),
                date: { gte: dayStart, lte: dayEnd },
                status: { in: ['SCHEDULED', 'CONFIRMED'] }
            },
            select: { date: true, duration: true }
        });

        const slots = [];
        let current = new Date(targetDate);
        const [startHours, startMins] = schedule.startTime.split(':');
        current.setHours(parseInt(startHours), parseInt(startMins), 0, 0);

        const end = new Date(targetDate);
        const [endHours, endMins] = schedule.endTime.split(':');
        end.setHours(parseInt(endHours), parseInt(endMins), 0, 0);

        while (current < end) {
            const slotStart = new Date(current);
            const slotEnd = new Date(current.getTime() + 30 * 60000);

            const isTaken = appointments.some(app => {
                const appStart = new Date(app.date);
                const appEnd = new Date(appStart.getTime() + (app.duration || 30) * 60000);
                return (slotStart < appEnd) && (slotEnd > appStart);
            });

            if (!isTaken) {
                slots.push(slotStart.toISOString());
            }
            current = slotEnd;
        }

        res.json(slots);
    } catch (error) {
        console.error('Error al calcular disponibilidad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getProfile,
    getMyAppointments,
    getMyTreatments,
    getMyDocuments,
    updateFcmToken,
    getAvailableDoctors,
    getAvailability
};

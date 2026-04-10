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

module.exports = {
    getProfile,
    getMyAppointments,
    getMyTreatments,
    getMyDocuments,
    updateFcmToken
};

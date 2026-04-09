const prisma = require('../utils/prisma');

const getMyPrescriptions = async (req, res) => {
    try {
        const { patientId } = req.user;
        if (!patientId) return res.status(403).json({ message: 'No es un perfil de paciente' });

        const prescriptions = await prisma.prescription.findMany({
            where: { patientId },
            include: {
                items: true,
                doctor: { select: { name: true } },
                branch: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        res.json(prescriptions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener recetas' });
    }
};

const createPrescription = async (req, res) => {
    try {
        const { patientId, items, notes, branchId } = req.body;
        const doctorId = req.user.id;
        const companyId = req.user.companyId;

        const prescription = await prisma.prescription.create({
            data: {
                patientId,
                doctorId,
                companyId,
                branchId,
                notes,
                items: {
                    create: items.map(item => ({
                        medicineName: item.medicineName,
                        dosage: item.dosage,
                        frequency: item.frequency,
                        duration: item.duration,
                        instructions: item.instructions
                    }))
                }
            },
            include: { items: true }
        });

        res.status(201).json(prescription);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear receta' });
    }
};

module.exports = {
    getMyPrescriptions,
    createPrescription
};

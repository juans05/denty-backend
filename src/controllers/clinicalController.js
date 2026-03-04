const prisma = require('../utils/prisma');

/**
 * Saves or updates a clinical form (Anamnesis, Endodontics, etc.)
 */
exports.saveForm = async (req, res) => {
    const { patientId, type, data } = req.body;
    const doctorId = parseInt(req.user.id || req.user.userId);

    if (isNaN(doctorId)) {
        return res.status(403).json({ message: 'Sesión inválida: No se pudo identificar al odontólogo.' });
    }

    const pId = parseInt(patientId);
    const dId = doctorId;

    try {
        const form = await prisma.clinicalForm.upsert({
            where: {
                patientId_type: {
                    patientId: pId,
                    type: type
                }
            },
            update: {
                data: data,
                doctor: { connect: { id: dId } },
                updatedAt: new Date()
            },
            create: {
                patient: { connect: { id: pId } },
                doctor: { connect: { id: dId } },
                type: type,
                data: data
            }
        });

        res.json(form);
    } catch (e) {
        console.error('Error saving clinical form:', e);
        res.status(500).json({ message: 'Error al guardar el formulario clínico', error: e.message });
    }
};

/**
 * Retrieves a specific clinical form for a patient
 */
exports.getForm = async (req, res) => {
    const { patientId, type } = req.params;

    try {
        const form = await prisma.clinicalForm.findUnique({
            where: {
                patientId_type: {
                    patientId: parseInt(patientId),
                    type: type
                }
            },
            include: {
                doctor: {
                    select: { name: true }
                }
            }
        });

        if (!form) {
            return res.status(404).json({ message: 'Formulario no encontrado' });
        }

        res.json(form);
    } catch (e) {
        console.error('Error fetching clinical form:', e);
        res.status(500).json({ message: 'Error al obtener el formulario clínico', error: e.message });
    }
};

const prisma = require('../utils/prisma');

const getPatientFiles = async (req, res) => {
    try {
        const { patientId } = req.params;
        const files = await prisma.patientFile.findMany({
            where: { patientId: parseInt(patientId) },
            orderBy: { createdAt: 'desc' }
        });
        res.json(files);
    } catch (error) {
        console.error('Error getPatientFiles:', error);
        res.status(500).json({ message: 'Error al obtener archivos del paciente', detail: error.message });
    }
};

const uploadPatientFile = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { name } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún archivo' });
        }

        const file = await prisma.patientFile.create({
            data: {
                patientId: parseInt(patientId),
                name: name || req.file.originalname,
                url: req.file.path, // Cloudinary URL
                type: req.file.mimetype
            }
        });

        res.json(file);
    } catch (error) {
        console.error('Error uploadPatientFile:', error);
        res.status(500).json({ message: 'Error al subir archivo', detail: error.message });
    }
};

const deletePatientFile = async (req, res) => {
    try {
        const { id } = req.params;
        // In a real scenario, you'd also delete from Cloudinary using cloudinary.uploader.destroy(public_id)
        await prisma.patientFile.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Archivo eliminado' });
    } catch (error) {
        console.error('Error deletePatientFile:', error);
        res.status(500).json({ message: 'Error al eliminar archivo', detail: error.message });
    }
};

module.exports = {
    getPatientFiles,
    uploadPatientFile,
    deletePatientFile
};

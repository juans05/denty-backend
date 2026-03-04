const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_TEMPLATES = [
    {
        title: 'Consentimiento General de Tratamiento',
        content: `Yo, el/la paciente o representante legal, declaro que he sido informado/a sobre los procedimientos dentales que se realizarán, sus riesgos, beneficios y alternativas de tratamiento. Autorizo al personal odontológico de esta clínica a realizar los procedimientos necesarios para mi atención dental.\n\nEntiendo que:\n1. El tratamiento dental conlleva ciertos riesgos inherentes.\n2. Los resultados no pueden ser garantizados al 100%.\n3. Es mi responsabilidad seguir las indicaciones postoperatorias.\n4. Puedo retirar este consentimiento en cualquier momento antes del inicio del procedimiento.\n\nConfirmo que la información proporcionada sobre mi salud es verídica y completa.`
    },
    {
        title: 'Consentimiento para Extracción Dental',
        content: `Yo, el/la paciente o representante legal, autorizo la extracción del/los diente(s) indicado(s) por el profesional tratante. He sido informado/a sobre:\n\n1. La necesidad clínica del procedimiento.\n2. Los riesgos: sangrado, infección, lesión a estructuras adyacentes, trismo, alveolitis.\n3. El proceso de cicatrización y cuidados postoperatorios.\n4. Las alternativas de tratamiento disponibles.\n\nDeclaro haber informado sobre alergias medicamentosas, enfermedades sistémicas y medicamentos que consumo actualmente.`
    },
    {
        title: 'Consentimiento para Tratamiento de Conductos (Endodoncia)',
        content: `Yo, el/la paciente o representante legal, autorizo el tratamiento de conductos radiculares en el/los diente(s) indicado(s). He sido informado/a sobre:\n\n1. El procedimiento consiste en la eliminación del tejido pulpar infectado o necrótico.\n2. Puede requerir múltiples sesiones de tratamiento.\n3. Riesgos: fractura de instrumentos, perforación de conductos, reinfección.\n4. El diente tratado podría necesitar restauración con corona dental.\n5. No se garantiza el 100% de éxito del tratamiento.\n\nAcepto los términos y las condiciones del tratamiento propuesto.`
    },
    {
        title: 'Consentimiento para Blanqueamiento Dental',
        content: `Yo, el/la paciente o representante legal, autorizo el procedimiento de blanqueamiento dental. He sido informado/a sobre:\n\n1. El procedimiento utiliza agentes blanqueadores (peróxido de hidrógeno/carbamida).\n2. Puede presentarse sensibilidad dental temporal durante y después del tratamiento.\n3. Los resultados varían según el tipo de mancha y estructura dental de cada paciente.\n4. No actúa sobre restauraciones existentes (coronas, carillas, obturaciones).\n5. Se recomienda evitar alimentos y bebidas pigmentantes por 48 horas post-tratamiento.\n\nDeclaro no tener contraindicaciones conocidas para este procedimiento.`
    }
];

const getTemplates = async (req, res) => {
    try {
        const templates = await prisma.consentTemplate.findMany({
            where: { companyId: req.user.companyId, active: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener plantillas', detail: error.message });
    }
};

const createTemplate = async (req, res) => {
    try {
        const { title, content } = req.body;
        const template = await prisma.consentTemplate.create({
            data: { title, content, companyId: req.user.companyId }
        });
        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear plantilla', detail: error.message });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const template = await prisma.consentTemplate.update({
            where: { id: parseInt(id) },
            data: { title, content }
        });
        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar plantilla', detail: error.message });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.consentTemplate.update({
            where: { id: parseInt(id) },
            data: { active: false }
        });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar plantilla', detail: error.message });
    }
};

const getPatientConsents = async (req, res) => {
    try {
        const { patientId } = req.params;
        const consents = await prisma.patientConsent.findMany({
            where: { patientId: parseInt(patientId) },
            include: { template: true },
            orderBy: { signedAt: 'desc' }
        });
        res.json(consents);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener consentimientos', detail: error.message });
    }
};

const signConsent = async (req, res) => {
    try {
        const { patientId, templateId, signature, signedBy } = req.body;
        const consent = await prisma.patientConsent.create({
            data: {
                patientId: parseInt(patientId),
                templateId: parseInt(templateId),
                signature,
                signedBy: signedBy || null
            },
            include: { template: true }
        });
        res.json(consent);
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar firma', detail: error.message });
    }
};

const deleteConsent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.patientConsent.delete({ where: { id: parseInt(id) } });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar consentimiento', detail: error.message });
    }
};

const uploadConsentFile = async (req, res) => {
    try {
        const { patientId, templateId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún archivo' });
        }

        const consent = await prisma.patientConsent.create({
            data: {
                patientId: parseInt(patientId),
                templateId: parseInt(templateId),
                fileUrl: req.file.path
            },
            include: { template: true }
        });

        res.json(consent);
    } catch (error) {
        console.error('Error uploadConsentFile:', error);
        res.status(500).json({ message: 'Error al subir archivo de consentimiento', detail: error.message });
    }
};

// Seed default dental consent templates for a company
const seedDefaultTemplates = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const existing = await prisma.consentTemplate.count({ where: { companyId } });
        if (existing > 0) {
            return res.json({ message: 'Ya existen plantillas para esta empresa', created: 0 });
        }
        const created = await prisma.consentTemplate.createMany({
            data: DEFAULT_TEMPLATES.map(t => ({ ...t, companyId }))
        });
        res.json({ message: 'Plantillas creadas exitosamente', created: created.count });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear plantillas por defecto', detail: error.message });
    }
};

module.exports = {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getPatientConsents,
    signConsent,
    deleteConsent,
    uploadConsentFile,
    seedDefaultTemplates
};

const prisma = require('../utils/prisma');

const getPatients = async (req, res) => {
    try {
        const { id: userId, companyId, role } = req.user;
        const { documentId } = req.query;

        const where = { companyId, active: true };
        if (documentId) where.documentId = documentId;

        // Si es médico (DENTIST), solo ve sus pacientes (que tengan citas o planes con él)
        if (role === 'DENTIST') {
            where.OR = [
                { appointments: { some: { doctorId: userId } } },
                { treatmentPlans: { some: { doctorId: userId } } }
            ];
        }

        const patients = await prisma.patient.findMany({
            where,
            include: {
                appointments: {
                    orderBy: { date: 'desc' },
                    take: 1
                }
            }
        });
        res.json(patients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener pacientes' });
    }
};

const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, companyId, role } = req.user;

        const where = {
            id: parseInt(id),
            companyId,
            active: true
        };

        // Si es médico (DENTIST), validar que el paciente sea suyo
        if (role === 'DENTIST') {
            where.OR = [
                { appointments: { some: { doctorId: userId } } },
                { treatmentPlans: { some: { doctorId: userId } } }
            ];
        }

        const patient = await prisma.patient.findFirst({
            where,
            include: {
                appointments: true,
                odontograms: true
            }
        });

        if (!patient) {
            return res.status(404).json({ message: 'Paciente no encontrado o acceso denegado' });
        }
        res.json(patient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener el paciente' });
    }
};

const createPatient = async (req, res) => {
    try {
        const { companyId } = req.user;

        if (!companyId) {
            return res.status(400).json({ message: 'Error: El usuario no tiene una compañía asociada.' });
        }

        const {
            firstName,
            paternalSurname,
            maternalSurname,
            nickname,
            documentType,
            documentId,
            nationality,
            birthDate,
            birthCountry,
            gender,
            civilStatus,
            hcNumber,
            occupation,
            lineOfBusiness,
            additionalInfo,
            allergies,
            notes,
            tags,
            fiscalData,
            phoneMobile,
            phoneHome,
            phone,
            email,
            webUser,
            webPassword,
            whatsappEnabled,
            ubigeoAddress,
            ubigeoCode,
            address,
            reference,
            medicalHistory,
            leadSource,
            insurance,
            hasGuardian,
            guardianName,
            guardianDocumentId,
            guardianPhone
        } = req.body;

        const lastName = `${paternalSurname || ''} ${maternalSurname || ''}`.trim();

        const patient = await prisma.patient.create({
            data: {
                firstName,
                lastName: lastName || 'Paciente',
                paternalSurname,
                maternalSurname,
                nickname,
                documentType,
                documentId,
                nationality,
                birthDate: new Date(birthDate),
                birthCountry: birthCountry || 'Perú',
                gender,
                civilStatus,
                hcNumber,
                occupation,
                lineOfBusiness,
                additionalInfo,
                allergies,
                notes,
                tags,
                fiscalData,
                phoneMobile,
                phoneHome,
                phone,
                email,
                webUser,
                webPassword,
                whatsappEnabled: whatsappEnabled === undefined ? true : whatsappEnabled,
                ubigeoAddress,
                ubigeoCode,
                address,
                reference,
                medicalHistory,
                leadSource,
                insurance,
                hasGuardian: !!hasGuardian,
                guardianName,
                guardianDocumentId,
                guardianPhone,
                active: true,
                company: { connect: { id: parseInt(companyId) } }
            }
        });

        res.status(201).json(patient);
    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ message: 'Error al crear paciente', error: error.message });
    }
};

const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const data = req.body;

        const updateData = {
            firstName: data.firstName,
            paternalSurname: data.paternalSurname,
            maternalSurname: data.maternalSurname,
            nickname: data.nickname,
            documentType: data.documentType,
            documentId: data.documentId,
            nationality: data.nationality,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            birthCountry: data.birthCountry,
            gender: data.gender,
            civilStatus: data.civilStatus,
            hcNumber: data.hcNumber,
            occupation: data.occupation,
            lineOfBusiness: data.lineOfBusiness,
            additionalInfo: data.additionalInfo,
            allergies: data.allergies,
            notes: data.notes,
            tags: data.tags,
            fiscalData: data.fiscalData,
            phoneMobile: data.phoneMobile,
            phoneHome: data.phoneHome,
            phone: data.phone,
            email: data.email,
            webUser: data.webUser,
            webPassword: data.webPassword,
            whatsappEnabled: data.whatsappEnabled,
            ubigeoAddress: data.ubigeoAddress,
            ubigeoCode: data.ubigeoCode,
            address: data.address,
            reference: data.reference,
            medicalHistory: data.medicalHistory,
            leadSource: data.leadSource,
            insurance: data.insurance,
            hasGuardian: data.hasGuardian !== undefined ? !!data.hasGuardian : undefined,
            guardianName: data.guardianName,
            guardianDocumentId: data.guardianDocumentId,
            guardianPhone: data.guardianPhone,
            active: data.active
        };

        if (updateData.paternalSurname || updateData.maternalSurname) {
            updateData.lastName = `${updateData.paternalSurname || ''} ${updateData.maternalSurname || ''}`.trim();
        }

        const patient = await prisma.patient.updateMany({
            where: {
                id: parseInt(id),
                companyId
            },
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        });

        if (patient.count === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado o inaccesible' });
        }

        res.json({ message: 'Paciente actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ message: 'Error al actualizar paciente', error: error.message });
    }
};

const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const patient = await prisma.patient.updateMany({
            where: {
                id: parseInt(id),
                companyId
            },
            data: {
                active: false
            }
        });

        if (patient.count === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        res.json({ message: 'Paciente desactivado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al desactivar paciente' });
    }
};

module.exports = {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient
};

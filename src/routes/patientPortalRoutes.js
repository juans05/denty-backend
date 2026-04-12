const express = require('express');
const router = express.Router();
const patientPortalController = require('../controllers/patientPortalController');
const { bookAppointmentByPatient } = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/profile', patientPortalController.getProfile);
router.get('/appointments', patientPortalController.getMyAppointments);
router.get('/treatments', patientPortalController.getMyTreatments);
router.get('/documents', patientPortalController.getMyDocuments);
router.put('/fcm-token', patientPortalController.updateFcmToken);
router.get('/doctors', patientPortalController.getAvailableDoctors);
router.get('/availability', patientPortalController.getAvailability);

// Sedes disponibles para el paciente (filtradas por empresa del paciente)
router.get('/branches', patientPortalController.getBranches);

// Agendar cita directamente desde el app del paciente
router.post('/book', bookAppointmentByPatient);

// Cambiar contraseña del paciente
router.put('/change-password', patientPortalController.changePassword);

module.exports = router;

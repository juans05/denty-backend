const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/doctors', appointmentController.getDoctorsByBranch);
router.get('/slots', appointmentController.getAvailableSlots);
router.get('/available-days', appointmentController.getAvailableDays);
router.get('/', appointmentController.getAppointments);
router.post('/', appointmentController.createAppointment);
router.put('/:id/attend', appointmentController.attendAppointment);
router.put('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;

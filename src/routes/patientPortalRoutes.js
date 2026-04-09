const express = require('express');
const router = express.Router();
const patientPortalController = require('../controllers/patientPortalController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/profile', patientPortalController.getProfile);
router.get('/appointments', patientPortalController.getMyAppointments);
router.get('/treatments', patientPortalController.getMyTreatments);
router.get('/documents', patientPortalController.getMyDocuments);

module.exports = router;

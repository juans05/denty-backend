const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/checkPermission');

router.use(authMiddleware);

router.get('/', checkPermission('patients:view'), patientController.getPatients);
router.get('/:id', checkPermission('patients:view'), patientController.getPatientById);
router.post('/', checkPermission('patients:create'), patientController.createPatient);
router.put('/:id', checkPermission('patients:edit'), patientController.updatePatient);
router.delete('/:id', checkPermission('patients:delete'), patientController.deletePatient);

module.exports = router;

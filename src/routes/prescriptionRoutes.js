const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/my-prescriptions', prescriptionController.getMyPrescriptions);
router.post('/', prescriptionController.createPrescription);

module.exports = router;

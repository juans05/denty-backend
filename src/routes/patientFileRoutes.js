const express = require('express');
const router = express.Router();
const patientFileController = require('../controllers/patientFileController');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../config/cloudinary');

router.get('/:patientId', authMiddleware, patientFileController.getPatientFiles);
router.post('/:patientId/upload', authMiddleware, upload.single('file'), patientFileController.uploadPatientFile);
router.delete('/:id', authMiddleware, patientFileController.deletePatientFile);

module.exports = router;

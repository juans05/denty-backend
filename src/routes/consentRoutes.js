const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../config/cloudinary');

router.get('/templates', authMiddleware, consentController.getTemplates);
router.post('/templates', authMiddleware, consentController.createTemplate);
router.put('/templates/:id', authMiddleware, consentController.updateTemplate);
router.delete('/templates/:id', authMiddleware, consentController.deleteTemplate);
router.post('/templates/seed', authMiddleware, consentController.seedDefaultTemplates);
router.get('/patient/:patientId', authMiddleware, consentController.getPatientConsents);
router.post('/sign', authMiddleware, consentController.signConsent);
router.delete('/:id', authMiddleware, consentController.deleteConsent);
router.post('/upload/:patientId/:templateId', authMiddleware, upload.single('file'), consentController.uploadConsentFile);

module.exports = router;

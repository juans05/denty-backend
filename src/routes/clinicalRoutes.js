const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/checkPermission');

router.use(authMiddleware);

// POST /api/clinical/forms - Save or Update
router.post('/forms', checkPermission('history:edit'), clinicalController.saveForm);

// GET /api/clinical/forms/:patientId/:type - Retrieve
router.get('/forms/:patientId/:type', checkPermission('history:view'), clinicalController.getForm);

module.exports = router;

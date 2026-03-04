const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/odontogramController');

router.get('/:patientId', authMiddleware, ctrl.getOdontogram);
router.get('/:patientId/history/:toothNumber', authMiddleware, ctrl.getToothHistory);
router.post('/:patientId/new', authMiddleware, ctrl.createNewVisit);
router.put('/:patientId', authMiddleware, ctrl.saveOdontogram);
router.delete('/:patientId/reset', authMiddleware, ctrl.resetOdontogram);

module.exports = router;

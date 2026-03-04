const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/treatmentController');

// ⚠️ IMPORTANT: /items/:itemId must be declared BEFORE /:id
// Otherwise Express captures "items" as the :id parameter

// Treatment Items (must come first)
router.patch('/items/:itemId', authMiddleware, ctrl.updateTreatmentItem);
router.delete('/items/:itemId', authMiddleware, ctrl.deleteTreatmentItem);

// Treatment Plans
router.get('/', authMiddleware, ctrl.getTreatmentPlans);
router.get('/:id', authMiddleware, ctrl.getTreatmentPlanById);
router.post('/', authMiddleware, ctrl.createTreatmentPlan);
router.patch('/:id', authMiddleware, ctrl.updateTreatmentPlan);
router.post('/:id/items', authMiddleware, ctrl.addTreatmentItem);

module.exports = router;

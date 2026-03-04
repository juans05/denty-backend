const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/scheduleController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/',           ctrl.getSchedule);
router.post('/',          ctrl.upsertSchedule);
router.get('/blocked',    ctrl.getBlockedSlots);
router.post('/blocked',   ctrl.createBlockedSlot);
router.delete('/blocked/:id', ctrl.deleteBlockedSlot);

module.exports = router;

const express = require('express');
const router = express.Router();
const consultoryController = require('../controllers/consultoryController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, consultoryController.getConsultories);
router.post('/', authMiddleware, consultoryController.createConsultory);
router.patch('/:id', authMiddleware, consultoryController.updateConsultory);

module.exports = router;

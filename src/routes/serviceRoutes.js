const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getServices, getServiceById, createService, updateService, deleteService } = require('../controllers/serviceController');

router.get('/', authMiddleware, getServices);
router.get('/:id', authMiddleware, getServiceById);
router.post('/', authMiddleware, createService);
router.put('/:id', authMiddleware, updateService);
router.delete('/:id', authMiddleware, deleteService);

module.exports = router;

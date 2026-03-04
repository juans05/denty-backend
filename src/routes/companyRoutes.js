const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', companyController.getCompany);
router.put('/', companyController.updateCompany);

module.exports = router;

const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, branchController.getBranches);
router.post('/', authMiddleware, branchController.createBranch);
router.put('/:id', authMiddleware, branchController.updateBranch);
router.delete('/:id', authMiddleware, branchController.deleteBranch);

module.exports = router;

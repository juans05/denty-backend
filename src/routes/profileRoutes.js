const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, profileController.getProfiles);
router.get('/permissions', authMiddleware, profileController.getPermissions);
router.post('/', authMiddleware, profileController.createProfile);
router.put('/:id', authMiddleware, profileController.updateProfile);
router.delete('/:id', authMiddleware, profileController.deleteProfile);

module.exports = router;

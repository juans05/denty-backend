const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const authMiddleware = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.post('/register-company', authController.registerCompany); // Público: alta de nueva clínica SaaS
router.post('/register', authMiddleware, authController.register); // Protected: requiere sesión activa
router.get('/users', authMiddleware, authController.getUsers);
router.put('/users/:id', authMiddleware, authController.updateUser);
router.delete('/users/:id', authMiddleware, authController.deleteUser);

module.exports = router;

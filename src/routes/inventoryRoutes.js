const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const inv = require('../controllers/inventoryController');

// Productos
router.get('/products', auth, inv.getProducts);
router.post('/products', auth, inv.createProduct);
router.put('/products/:id', auth, inv.updateProduct);
router.delete('/products/:id', auth, inv.deleteProduct);
router.post('/products/import-excel', auth, inv.importProductsExcel);

// Stock
router.get('/stock', auth, inv.getStock);
router.post('/stock/entrada', auth, inv.registerEntrada);
router.post('/stock/ajuste', auth, inv.registerAjuste);

// Recetas
router.get('/services/:serviceId/recipe', auth, inv.getRecipe);
router.post('/services/:serviceId/recipe', auth, inv.saveRecipe);
router.post('/recipes/import-excel', auth, inv.importRecipesExcel);

// Movimientos
router.get('/movements', auth, inv.getMovements);

module.exports = router;

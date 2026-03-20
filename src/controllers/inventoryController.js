'use strict';
const prisma = require('../utils/prisma');

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/inventory/products
const getProducts = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { active } = req.query;
        const where = { companyId };
        if (active !== undefined) where.active = active === 'true';

        const products = await prisma.inventoryProduct.findMany({
            where,
            include: {
                stocks: { include: { branch: { select: { id: true, name: true } } } },
                recipeItems: { include: { service: { select: { id: true, name: true } } } },
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener productos', detail: err.message });
    }
};

// POST /api/inventory/products
const createProduct = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { name, unit, category, minStock } = req.body;
        if (!name || !unit || !category) {
            return res.status(400).json({ message: 'Campos requeridos: nombre, unidad, categoría' });
        }
        const product = await prisma.inventoryProduct.create({
            data: { name, unit, category, minStock: parseFloat(minStock) || 0, companyId },
        });
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ message: 'Error al crear producto', detail: err.message });
    }
};

// PUT /api/inventory/products/:id
const updateProduct = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const id = parseInt(req.params.id);
        const { name, unit, category, minStock, active } = req.body;

        const existing = await prisma.inventoryProduct.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ message: 'Producto no encontrado' });

        const product = await prisma.inventoryProduct.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(unit !== undefined && { unit }),
                ...(category !== undefined && { category }),
                ...(minStock !== undefined && { minStock: parseFloat(minStock) }),
                ...(active !== undefined && { active }),
            },
        });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar producto', detail: err.message });
    }
};

// DELETE /api/inventory/products/:id  (logical)
const deleteProduct = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const id = parseInt(req.params.id);
        const existing = await prisma.inventoryProduct.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ message: 'Producto no encontrado' });
        await prisma.inventoryProduct.update({ where: { id }, data: { active: false } });
        res.json({ message: 'Producto desactivado correctamente' });
    } catch (err) {
        res.status(500).json({ message: 'Error al desactivar producto', detail: err.message });
    }
};

// POST /api/inventory/products/import-excel  — importar catálogo masivo
const importProductsExcel = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { rows } = req.body; // [{ nombre, unidad, categoria, stock_minimo }]
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: 'No se recibieron filas para importar' });
        }

        const errors = [];
        const created = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const { nombre, unidad, categoria, stock_minimo } = row;
            if (!nombre || !unidad || !categoria) {
                errors.push({ fila: i + 2, error: 'Faltan campos obligatorios: nombre, unidad, categoria' });
                continue;
            }
            try {
                // Upsert por nombre+empresa: actualiza si existe, crea si no
                const existingProd = await prisma.inventoryProduct.findFirst({
                    where: { name: String(nombre).trim(), companyId },
                });
                if (existingProd) {
                    await prisma.inventoryProduct.update({
                        where: { id: existingProd.id },
                        data: {
                            unit: String(unidad).trim(),
                            category: String(categoria).trim(),
                            minStock: parseFloat(stock_minimo) || 0,
                            active: true,
                        },
                    });
                    created.push({ nombre, accion: 'actualizado' });
                } else {
                    await prisma.inventoryProduct.create({
                        data: {
                            name: String(nombre).trim(),
                            unit: String(unidad).trim(),
                            category: String(categoria).trim(),
                            minStock: parseFloat(stock_minimo) || 0,
                            companyId,
                        },
                    });
                    created.push({ nombre, accion: 'creado' });
                }
            } catch (e) {
                errors.push({ fila: i + 2, error: e.message });
            }
        }

        res.json({ message: `${created.length} productos procesados`, created, errors });
    } catch (err) {
        res.status(500).json({ message: 'Error al importar productos', detail: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCK POR SEDE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/inventory/stock?branchId=X
const getStock = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { branchId } = req.query;

        const products = await prisma.inventoryProduct.findMany({
            where: { companyId, active: true },
            include: {
                stocks: branchId
                    ? { where: { branchId: parseInt(branchId) }, include: { branch: { select: { id: true, name: true } } } }
                    : { include: { branch: { select: { id: true, name: true } } } },
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        // Enriquecer: marcar cuáles tienen stock bajo el mínimo
        const enriched = products.map(p => ({
            ...p,
            lowStock: p.stocks.some(s => s.quantity <= p.minStock && p.minStock > 0),
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener stock', detail: err.message });
    }
};

// POST /api/inventory/stock/entrada
const registerEntrada = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const { productId, branchId, quantity, reason } = req.body;
        if (!productId || !branchId || !quantity) {
            return res.status(400).json({ message: 'Campos requeridos: productId, branchId, cantidad' });
        }

        const qty = parseFloat(quantity);
        if (qty <= 0) return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });

        // Upsert stock
        const stock = await prisma.inventoryStock.upsert({
            where: { productId_branchId: { productId: parseInt(productId), branchId: parseInt(branchId) } },
            update: { quantity: { increment: qty } },
            create: { productId: parseInt(productId), branchId: parseInt(branchId), quantity: qty },
        });

        // Registrar movimiento
        await prisma.inventoryMovement.create({
            data: {
                productId: parseInt(productId),
                branchId: parseInt(branchId),
                type: 'ENTRADA',
                quantity: qty,
                reason: reason || 'Ingreso de stock',
                createdBy: userId,
            },
        });

        res.status(201).json({ stock, message: 'Entrada registrada correctamente' });
    } catch (err) {
        res.status(500).json({ message: 'Error al registrar entrada', detail: err.message });
    }
};

// POST /api/inventory/stock/ajuste
const registerAjuste = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const { productId, branchId, quantity, reason } = req.body;
        if (!productId || !branchId || quantity === undefined) {
            return res.status(400).json({ message: 'Campos requeridos: productId, branchId, cantidad' });
        }

        const qty = parseFloat(quantity);

        const stock = await prisma.inventoryStock.upsert({
            where: { productId_branchId: { productId: parseInt(productId), branchId: parseInt(branchId) } },
            update: { quantity: qty },
            create: { productId: parseInt(productId), branchId: parseInt(branchId), quantity: qty },
        });

        await prisma.inventoryMovement.create({
            data: {
                productId: parseInt(productId),
                branchId: parseInt(branchId),
                type: 'AJUSTE',
                quantity: qty,
                reason: reason || 'Ajuste manual de inventario',
                createdBy: userId,
            },
        });

        res.json({ stock, message: 'Ajuste registrado correctamente' });
    } catch (err) {
        res.status(500).json({ message: 'Error al registrar ajuste', detail: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECETAS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/inventory/services/:serviceId/recipe
const getRecipe = async (req, res) => {
    try {
        const serviceId = parseInt(req.params.serviceId);
        const recipe = await prisma.serviceRecipeItem.findMany({
            where: { serviceId },
            include: { product: { select: { id: true, name: true, unit: true, category: true } } },
        });
        res.json(recipe);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener receta', detail: err.message });
    }
};

// POST /api/inventory/services/:serviceId/recipe  — reemplaza toda la receta
const saveRecipe = async (req, res) => {
    try {
        const serviceId = parseInt(req.params.serviceId);
        const { items } = req.body; // [{ productId, quantity }]

        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'Se esperaba un array de items' });
        }

        // Reemplazar completamente la receta
        await prisma.serviceRecipeItem.deleteMany({ where: { serviceId } });

        if (items.length > 0) {
            await prisma.serviceRecipeItem.createMany({
                data: items.map(i => ({
                    serviceId,
                    productId: parseInt(i.productId),
                    quantity: parseFloat(i.quantity),
                })),
            });
        }

        const recipe = await prisma.serviceRecipeItem.findMany({
            where: { serviceId },
            include: { product: { select: { id: true, name: true, unit: true } } },
        });
        res.json({ message: 'Receta guardada correctamente', recipe });
    } catch (err) {
        res.status(500).json({ message: 'Error al guardar receta', detail: err.message });
    }
};

// POST /api/inventory/recipes/import-excel
const importRecipesExcel = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { rows } = req.body; // [{ nombre_servicio, nombre_producto, cantidad }]
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: 'No se recibieron filas para importar' });
        }

        const errors = [];
        const processed = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const { nombre_servicio, nombre_producto, cantidad } = row;
            if (!nombre_servicio || !nombre_producto || !cantidad) {
                errors.push({ fila: i + 2, error: 'Faltan campos: nombre_servicio, nombre_producto, cantidad' });
                continue;
            }

            const service = await prisma.service.findFirst({
                where: { name: String(nombre_servicio).trim(), companyId },
            });
            if (!service) {
                errors.push({ fila: i + 2, error: `Servicio no encontrado: "${nombre_servicio}"` });
                continue;
            }

            const product = await prisma.inventoryProduct.findFirst({
                where: { name: String(nombre_producto).trim(), companyId },
            });
            if (!product) {
                errors.push({ fila: i + 2, error: `Producto no encontrado: "${nombre_producto}"` });
                continue;
            }

            await prisma.serviceRecipeItem.upsert({
                where: { serviceId_productId: { serviceId: service.id, productId: product.id } },
                update: { quantity: parseFloat(cantidad) },
                create: { serviceId: service.id, productId: product.id, quantity: parseFloat(cantidad) },
            });
            processed.push({ nombre_servicio, nombre_producto, cantidad });
        }

        res.json({ message: `${processed.length} ingredientes procesados`, processed, errors });
    } catch (err) {
        res.status(500).json({ message: 'Error al importar recetas', detail: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// MOVIMIENTOS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/inventory/movements?branchId=X&productId=Y&type=Z&limit=50
const getMovements = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { branchId, productId, type, limit } = req.query;
        const take = parseInt(limit) || 100;

        const where = {
            product: { companyId },
        };
        if (branchId) where.branchId = parseInt(branchId);
        if (productId) where.productId = parseInt(productId);
        if (type) where.type = type;

        const movements = await prisma.inventoryMovement.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, unit: true, category: true } },
            },
            orderBy: { createdAt: 'desc' },
            take,
        });

        res.json(movements);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener movimientos', detail: err.message });
    }
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    importProductsExcel,
    getStock,
    registerEntrada,
    registerAjuste,
    getRecipe,
    saveRecipe,
    importRecipesExcel,
    getMovements,
};

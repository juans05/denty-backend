const prisma = require('../utils/prisma');

// GET /api/services — list active services for the company
const getServices = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { category, active } = req.query;

        const where = { companyId };
        if (category) where.category = category;
        if (active !== undefined) where.active = active === 'true';

        const services = await prisma.service.findMany({
            where,
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        res.json(services);
    } catch (error) {
        console.error('Error getServices:', error);
        res.status(500).json({ message: 'Error al obtener servicios', detail: error.message });
    }
};

// GET /api/services/:id
const getServiceById = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const id = parseInt(req.params.id);
        const service = await prisma.service.findFirst({ where: { id, companyId } });
        if (!service) return res.status(404).json({ message: 'Servicio no encontrado' });
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener servicio', detail: error.message });
    }
};

// POST /api/services
const createService = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const { name, category, description, price, duration } = req.body;

        if (!name || !category || price === undefined) {
            return res.status(400).json({ message: 'Campos requeridos: nombre, categoría, precio' });
        }

        const service = await prisma.service.create({
            data: {
                name,
                category,
                description: description || null,
                price: parseFloat(price),
                duration: duration ? parseInt(duration) : 30,
                companyId,
            },
        });
        res.status(201).json(service);
    } catch (error) {
        console.error('Error createService:', error);
        res.status(500).json({ message: 'Error al crear servicio', detail: error.message });
    }
};

// PUT /api/services/:id
const updateService = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const id = parseInt(req.params.id);
        const { name, category, description, price, duration, active } = req.body;

        const existing = await prisma.service.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ message: 'Servicio no encontrado' });

        const service = await prisma.service.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(category !== undefined && { category }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(duration !== undefined && { duration: parseInt(duration) }),
                ...(active !== undefined && { active }),
            },
        });
        res.json(service);
    } catch (error) {
        console.error('Error updateService:', error);
        res.status(500).json({ message: 'Error al actualizar servicio', detail: error.message });
    }
};

// DELETE /api/services/:id — logical delete
const deleteService = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const id = parseInt(req.params.id);

        const existing = await prisma.service.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ message: 'Servicio no encontrado' });

        await prisma.service.update({ where: { id }, data: { active: false } });
        res.json({ message: 'Servicio desactivado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al desactivar servicio', detail: error.message });
    }
};

module.exports = { getServices, getServiceById, createService, updateService, deleteService };

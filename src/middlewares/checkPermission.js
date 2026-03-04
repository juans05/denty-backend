/**
 * Middleware para validar permisos dinámicos basados en el perfil del usuario.
 * @param {string} permissionKey - La llave del permiso a validar (ej: 'patients:create')
 */
const checkPermission = (permissionKey) => {
    return (req, res, next) => {
        // El rol ADMIN de la base de datos (superadmin original) tiene acceso total por bypass
        if (req.user && req.user.role === 'ADMIN') {
            return next();
        }

        // Validar si el permiso solicitado está en la lista de permisos del usuario (poblada por authMiddleware)
        if (req.user && req.user.permissions && req.user.permissions.includes(permissionKey)) {
            return next();
        }

        return res.status(403).json({
            message: `Acceso denegado. No tienes el permiso necesario: [${permissionKey}] para realizar esta acción.`
        });
    };
};

module.exports = checkPermission;

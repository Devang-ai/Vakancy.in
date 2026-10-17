const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userRole = req.user.role;
    const effectiveRoles = [...allowedRoles];
    if (allowedRoles.includes('admin')) {
      effectiveRoles.push('main_admin', 'director');
    }

    if (!effectiveRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${userRole}' is not authorized to access this resource.`
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };

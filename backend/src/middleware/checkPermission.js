/**
 * Permission check middleware. ADMIN (*:*) bypasses all checks.
 * @param {string|string[]} required - Single permission or array (any of these grants access)
 */
export const checkPermission = (required) => {
  const perms = Array.isArray(required) ? required : [required];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userPerms = req.user.permissions || [];
    if (userPerms.includes("*:*")) return next();
    const hasAny = perms.some((p) => userPerms.includes(p));
    if (!hasAny) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

/**
 * Role check middleware. Requires one of the given role codes. ADMIN always has access.
 * @param {string|string[]} requiredRoles - Role code(s) - any grants access
 */
export const requireRole = (requiredRoles) => {
  const codes = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userPerms = req.user.permissions || [];
    if (userPerms.includes("*:*")) return next();
    const userRoleCode = req.user.roleCode;
    if (!userRoleCode || !codes.includes(userRoleCode)) {
      return res.status(403).json({ message: "Insufficient role access" });
    }
    next();
  };
};

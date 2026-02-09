import express from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { PERMISSIONS } from "../config.js";
import { logAudit } from "../middleware/audit.js";

const router = express.Router();

router.use(authenticate);

// List all users (admin only)
router.get("/", authorize([PERMISSIONS.MANAGE_USERS]), async (req, res) => {
  try {
    const users = await db.User.findAll({
      include: [{ model: db.Role, as: "role" }],
      order: [["createdAt", "DESC"]],
    });
    res.json(
      users.map((u) => {
        const base = {
          id: u.id,
          email: u.email,
          name: u.name,
          isActive: u.isActive,
          roleId: u.roleId,
          roleName: u.role?.name,
          roleCode: u.role?.code,
          createdAt: u.createdAt,
        };
        if (u.role?.code === "TECHNICIAN") {
          base.commissionRate = u.commissionRate;
          base.technicianLevel = u.technicianLevel;
          base.technicianLevelDisplay = u.technicianLevelDisplay;
        }
        return base;
      })
    );
  } catch (err) {
    console.error("List users error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all roles (admin only)
router.get("/roles", authorize([PERMISSIONS.MANAGE_USERS]), async (req, res) => {
  try {
    const roles = await db.Role.findAll({
      order: [["code", "ASC"], ["name", "ASC"]],
    });
    res.json(roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
    })));
  } catch (err) {
    console.error("List roles error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create user (admin only)
router.post("/", authorize([PERMISSIONS.MANAGE_USERS]), async (req, res) => {
  const {
    email,
    password,
    name,
    roleId,
    commissionRate,
    technicianLevel,
    technicianLevelDisplay,
    isActive = true,
  } = req.body;

  if (!email || !password || !name || !roleId) {
    return res.status(400).json({ message: "email, password, name, and roleId are required" });
  }

  try {
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const role = await db.Role.findByPk(roleId);
    const isTechnician = role?.code === "TECHNICIAN";
    const createData = {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      roleId,
      isActive,
    };
    if (isTechnician) {
      createData.commissionRate = commissionRate ?? 0.2;
      if (technicianLevel) createData.technicianLevel = technicianLevel;
      if (technicianLevelDisplay) createData.technicianLevelDisplay = technicianLevelDisplay;
    } else {
      createData.commissionRate = 0;
    }

    const user = await db.User.create(createData);

    const userWithRole = await db.User.findByPk(user.id, {
      include: [{ model: db.Role, as: "role" }],
    });

    await logAudit({
      userId: req.user.id,
      entityType: "User",
      entityId: user.id,
      action: "USER_CREATED",
      metadata: { email, name, roleId },
    });

    const resp = {
      id: userWithRole.id,
      email: userWithRole.email,
      name: userWithRole.name,
      isActive: userWithRole.isActive,
      roleId: userWithRole.roleId,
      roleName: userWithRole.role?.name,
      roleCode: userWithRole.role?.code,
    };
    if (userWithRole.role?.code === "TECHNICIAN") {
      resp.commissionRate = userWithRole.commissionRate;
      resp.technicianLevel = userWithRole.technicianLevel;
      resp.technicianLevelDisplay = userWithRole.technicianLevelDisplay;
    }
    res.status(201).json(resp);
  } catch (err) {
    console.error("Create user error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user (admin only)
router.put("/:id", authorize([PERMISSIONS.MANAGE_USERS]), async (req, res) => {
  const { id } = req.params;
  const {
    email,
    name,
    roleId,
    commissionRate,
    technicianLevel,
    technicianLevelDisplay,
    isActive,
    password,
  } = req.body;

  try {
    const existing = await db.User.findByPk(id, {
      include: [{ model: db.Role, as: "role" }],
    });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    // Safeguard: prevent demoting the last admin (superuser protection)
    const isAdmin = existing.role?.code === "ADMIN";
    if (isAdmin && roleId !== undefined && roleId !== existing.roleId) {
      const adminRole = await db.Role.findOne({ where: { code: "ADMIN" } });
      const adminCount = await db.User.count({
        where: { roleId: adminRole?.id, isActive: true },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot change role: there must always be at least one admin. Create another admin first.",
        });
      }
    }

    // Safeguard: prevent an admin from demoting themselves
    if (id === req.user.id && isAdmin && roleId !== undefined && roleId !== existing.roleId) {
      const newRole = await db.Role.findByPk(roleId);
      if (newRole?.code !== "ADMIN") {
        return res.status(400).json({
          message: "Admins cannot change their own role to a non-admin role.",
        });
      }
    }

    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const role = roleId ? await db.Role.findByPk(roleId) : existing.role;
    const isTechnician = role?.code === "TECHNICIAN";
    if (isTechnician) {
      if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
      if (technicianLevel !== undefined) updateData.technicianLevel = technicianLevel;
      if (technicianLevelDisplay !== undefined)
        updateData.technicianLevelDisplay = technicianLevelDisplay;
    } else {
      updateData.commissionRate = 0;
      updateData.technicianLevel = null;
      updateData.technicianLevelDisplay = null;
    }

    await existing.update(updateData);

    const user = await db.User.findByPk(id, {
      include: [{ model: db.Role, as: "role" }],
    });

    await logAudit({
      userId: req.user.id,
      entityType: "User",
      entityId: id,
      action: "USER_UPDATED",
      metadata: { updateData },
    });

    const resp = {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      roleId: user.roleId,
      roleName: user.role?.name,
      roleCode: user.role?.code,
    };
    if (user.role?.code === "TECHNICIAN") {
      resp.commissionRate = user.commissionRate;
      resp.technicianLevel = user.technicianLevel;
      resp.technicianLevelDisplay = user.technicianLevelDisplay;
    }
    res.json(resp);
  } catch (err) {
    console.error("Update user error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete user (admin only)
router.delete("/:id", authorize([PERMISSIONS.MANAGE_USERS]), async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }

  try {
    const user = await db.User.findByPk(id, {
      include: [{ model: db.Role, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Safeguard: cannot delete the last admin
    if (user.role?.code === "ADMIN") {
      const adminRole = await db.Role.findOne({ where: { code: "ADMIN" } });
      const adminCount = await db.User.count({
        where: { roleId: adminRole?.id, isActive: true },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last admin. There must always be at least one admin.",
        });
      }
    }

    await user.destroy();

    await logAudit({
      userId: req.user.id,
      entityType: "User",
      entityId: id,
      action: "USER_DELETED",
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

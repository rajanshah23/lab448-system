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
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isActive: u.isActive,
        commissionRate: u.commissionRate,
        roleId: u.roleId,
        roleName: u.role?.name,
        createdAt: u.createdAt,
      }))
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
      order: [["name", "ASC"]],
    });
    res.json(roles);
  } catch (err) {
    console.error("List roles error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create user (admin only)
router.post("/", authorize([PERMISSIONS.MANAGE_USERS]), async (req, res) => {
  const { email, password, name, roleId, commissionRate = 0.2, isActive = true } = req.body;

  if (!email || !password || !name || !roleId) {
    return res.status(400).json({ message: "email, password, name, and roleId are required" });
  }

  try {
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      email,
      passwordHash,
      name,
      roleId,
      commissionRate,
      isActive,
    });

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

    res.status(201).json({
      id: userWithRole.id,
      email: userWithRole.email,
      name: userWithRole.name,
      isActive: userWithRole.isActive,
      commissionRate: userWithRole.commissionRate,
      roleId: userWithRole.roleId,
      roleName: userWithRole.role?.name,
    });
  } catch (err) {
    console.error("Create user error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user (admin only)
router.put("/:id", authorize([PERMISSIONS.MANAGE_USERS]), async (req, res) => {
  const { id } = req.params;
  const { email, name, roleId, commissionRate, isActive, password } = req.body;

  try {
    const existing = await db.User.findByPk(id);
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
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

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      commissionRate: user.commissionRate,
      roleId: user.roleId,
      roleName: user.role?.name,
    });
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
    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

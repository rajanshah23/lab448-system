import express from "express";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

const buildTokenPayload = (user) => ({
  sub: user.id,
  email: user.email,
  roleId: user.roleId,
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await db.User.findOne({
      where: { email },
      include: [{ model: db.Role, as: "role" }],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(buildTokenPayload(user), JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const perms = user.role?.permissions || [];
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role?.name,
        roleCode: user.role?.code || null,
        permissions: Array.isArray(perms) ? perms : [],
        commissionRate: user.role?.code === "TECHNICIAN" ? user.commissionRate : null,
        technicianLevel: user.technicianLevel,
        technicianLevelDisplay: user.technicianLevelDisplay,
      },
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      include: [{ model: db.Role, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const perms = user.role?.permissions || [];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      roleCode: user.role?.code || null,
      permissions: Array.isArray(perms) ? perms : [],
      commissionRate: user.role?.code === "TECHNICIAN" ? user.commissionRate : null,
      technicianLevel: user.technicianLevel,
      technicianLevelDisplay: user.technicianLevelDisplay,
    });
  } catch (err) {
    console.error("Me error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Utility route to create an initial admin user (should be disabled in production)
router.post("/bootstrap-admin", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ message: "email, password and name are required" });
  }

  try {
    let adminRole = await db.Role.findOne({
      where: { [Op.or]: [{ code: "ADMIN" }, { name: "admin" }] },
    });
    if (!adminRole) {
      adminRole = await db.Role.create({
        id: "role_admin",
        code: "ADMIN",
        name: "HQ Access",
        description: "Full system access and configuration",
        permissions: ["*:*"],
      });
    }

    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      email,
      passwordHash,
      name,
      roleId: adminRole.id,
    });

    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("Bootstrap admin error", err);
    const message = err && (err.message || String(err));
    res.status(500).json({
      message: "Internal server error",
      error: message,
      ...(process.env.NODE_ENV !== "production" && err.stack && { details: err.stack }),
    });
  }
});

export default router;


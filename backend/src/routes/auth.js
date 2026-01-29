import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { JWT_EXPIRES_IN, JWT_SECRET, PERMISSIONS } from "../config.js";
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
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
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

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role?.name,
        permissions: user.role?.permissions || [],
      },
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      permissions: user.role?.permissions || [],
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
    let adminRole = await prisma.role.findFirst({
      where: { name: "admin" },
    });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: "admin",
          description: "System administrator",
          permissions: Object.values(PERMISSIONS),
        },
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roleId: adminRole.id,
      },
    });

    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("Bootstrap admin error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;


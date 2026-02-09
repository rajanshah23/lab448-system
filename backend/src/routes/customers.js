import express from "express";
import { Op } from "sequelize";
import db from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { PERMISSIONS } from "../config.js";

const router = express.Router();

router.use(authenticate);

/** Allow if user has any of the given permissions (for list/search and get customer). */
const authorizeAny = (perms) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const userPerms = req.user.permissions || [];
  if (!perms.some((p) => userPerms.includes(p)))
    return res.status(403).json({ message: "Forbidden" });
  next();
};

/**
 * List/search customers. Efficient: only runs filtered query with limit.
 * GET /api/customers?q=search&limit=20
 * - q: optional search string; filters by name, phone, or email (case-insensitive, contains).
 * - limit: max results (default 20, max 50).
 */
router.get(
  "/",
  authorizeAny([PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.INTAKE_REPAIR]),
  async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

      const where = {};
      if (q.length > 0) {
        const pattern = `%${q}%`;
        where[Op.or] = [
          { name: { [Op.iLike]: pattern } },
          { phone: { [Op.iLike]: pattern } },
          { phone2: { [Op.iLike]: pattern } },
          { email: { [Op.iLike]: pattern } },
        ];
      }

      const customers = await db.Customer.findAll({
        where,
        limit,
        order: [["name", "ASC"]],
        attributes: ["id", "name", "phone", "phone2", "email", "address", "createdAt"],
      });

      res.json(customers);
    } catch (err) {
      console.error("List customers error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * Get one customer with their repairs (for customer dashboard detail).
 * Repairs include device info for display.
 */
router.get(
  "/:id",
  authorizeAny([PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.INTAKE_REPAIR]),
  async (req, res) => {
    try {
      const customer = await db.Customer.findByPk(req.params.id, {
        include: [
          {
            model: db.Repair,
            as: "repairs",
            include: [{ model: db.Device, as: "device" }],
          },
        ],
        order: [["repairs", "createdAt", "DESC"]],
      });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (err) {
      console.error("Get customer error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * Update customer details (name, phone, phone2, email, address).
 */
router.put(
  "/:id",
  authorizeAny([PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.INTAKE_REPAIR]),
  async (req, res) => {
    try {
      const customer = await db.Customer.findByPk(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const { name, phone, phone2, email, address } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = String(name).trim();
      if (phone !== undefined) updates.phone = phone == null || phone === "" ? null : String(phone).trim();
      if (phone2 !== undefined) updates.phone2 = phone2 == null || phone2 === "" ? null : String(phone2).trim();
      if (email !== undefined) updates.email = email == null || email === "" ? null : String(email).trim();
      if (address !== undefined) updates.address = address == null || address === "" ? null : String(address).trim();
      if (updates.name !== undefined && !updates.name) {
        return res.status(400).json({ message: "Customer name is required" });
      }
      const finalPhone = updates.phone !== undefined ? updates.phone : customer.phone;
      const hasPrimaryPhone = finalPhone != null && String(finalPhone).trim() !== "";
      if (!hasPrimaryPhone) {
        return res.status(400).json({ message: "Please fill your primary phone number" });
      }
      if (Object.keys(updates).length === 0) {
        return res.json(customer);
      }
      await customer.update(updates);
      res.json(customer);
    } catch (err) {
      console.error("Update customer error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;

import express from "express";
import db from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { PERMISSIONS } from "../config.js";
import { logAudit } from "../middleware/audit.js";

const router = express.Router();

router.use(authenticate);

router.get("/", authorize([PERMISSIONS.MANAGE_INVENTORY]), async (req, res) => {
  try {
    const items = await db.Inventory.findAll({
      order: [["name", "ASC"]],
    });
    res.json(items);
  } catch (err) {
    console.error("Inventory list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/",
  authorize([PERMISSIONS.MANAGE_INVENTORY]),
  async (req, res) => {
    const { name, sku, quantity = 0, unitPrice = 0, isActive = true } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (quantity < 0) {
      return res.status(400).json({ message: "Quantity cannot be negative" });
    }

    try {
      const item = await db.Inventory.create({
        name,
        sku,
        quantity,
        unitPrice,
        isActive,
      });

      await logAudit({
        userId: req.user.id,
        entityType: "Inventory",
        entityId: item.id,
        action: "INVENTORY_CREATED",
        metadata: { name, sku, quantity, unitPrice },
      });

      res.status(201).json(item);
    } catch (err) {
      console.error("Inventory create error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.put(
  "/:id",
  authorize([PERMISSIONS.MANAGE_INVENTORY]),
  async (req, res) => {
    const { id } = req.params;
    const { name, sku, quantity, unitPrice, isActive } = req.body;

    if (quantity != null && quantity < 0) {
      return res.status(400).json({ message: "Quantity cannot be negative" });
    }

    try {
      const existing = await db.Inventory.findByPk(id);
      if (!existing) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      const updateData = {
        name: name ?? existing.name,
        sku: sku ?? existing.sku,
        quantity: quantity ?? existing.quantity,
        unitPrice: unitPrice ?? existing.unitPrice,
        isActive: isActive ?? existing.isActive,
      };

      await existing.update(updateData);

      await logAudit({
        userId: req.user.id,
        entityType: "Inventory",
        entityId: id,
        action: "INVENTORY_UPDATED",
        metadata: { before: existing.toJSON(), after: updateData },
      });

      res.json(existing);
    } catch (err) {
      console.error("Inventory update error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;


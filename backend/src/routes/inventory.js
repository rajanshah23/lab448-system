import express from "express";
import { prisma } from "../prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { PERMISSIONS } from "../config.js";
import { logAudit } from "../middleware/audit.js";

const router = express.Router();

router.use(authenticate);

router.get("/", authorize([PERMISSIONS.MANAGE_INVENTORY]), async (req, res) => {
  try {
    const items = await prisma.inventory.findMany({
      orderBy: { name: "asc" },
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
      const item = await prisma.inventory.create({
        data: {
          name,
          sku,
          quantity,
          unitPrice,
          isActive,
        },
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
      const existing = await prisma.inventory.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      const item = await prisma.inventory.update({
        where: { id },
        data: {
          name: name ?? existing.name,
          sku: sku ?? existing.sku,
          quantity: quantity ?? existing.quantity,
          unitPrice: unitPrice ?? existing.unitPrice,
          isActive: isActive ?? existing.isActive,
        },
      });

      await logAudit({
        userId: req.user.id,
        entityType: "Inventory",
        entityId: id,
        action: "INVENTORY_UPDATED",
        metadata: { before: existing, after: item },
      });

      res.json(item);
    } catch (err) {
      console.error("Inventory update error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;


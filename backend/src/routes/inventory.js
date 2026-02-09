import express from "express";
import { Op } from "sequelize";
import db, { sequelize } from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { requireRole } from "../middleware/checkPermission.js";
import { PERMISSIONS } from "../config.js";
import { logAudit } from "../middleware/audit.js";

const router = express.Router();

const logOrAdmin = requireRole(["LOGISTICS", "ADMIN"]);

const authorizeAny = (perms) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const userPerms = req.user.permissions || [];
  if (userPerms.includes("*:*")) return next();
  if (!perms.length) return next();
  if (!perms.some((p) => userPerms.includes(p))) return res.status(403).json({ message: "Forbidden" });
  next();
};

const recalcRepairTotals = async (repairId, transaction = null) => {
  const charges = await db.RepairCharge.findAll({
    where: { repairId },
    transaction,
  });
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  await db.Repair.update(
    { totalCharges },
    { where: { id: repairId }, transaction }
  );
};

router.use(authenticate);

// Lookup single item by id or sku (for repair workspace: add by key without loading full list)
router.get("/lookup", authorizeAny([PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.USE_INVENTORY]), async (req, res) => {
  const key = (req.query.key || req.query.q || "").toString().trim();
  if (!key) {
    return res.status(400).json({ message: "key or q query is required" });
  }
  try {
    const item = await db.Inventory.findOne({
      where: {
        isActive: true,
        [Op.or]: [{ id: key }, { sku: key }],
      },
    });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  } catch (err) {
    console.error("Inventory lookup error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Assign inventory to repair (LOGISTICS or ADMIN) - creates usage + repair charge
router.post(
  "/assign-to-repair",
  logOrAdmin,
  async (req, res) => {
    const { repair_id: repairId, inventory_id: inventoryId, quantity = 1, notes } = req.body;
    const rid = repairId || req.body.repairId;
    const iid = inventoryId || req.body.inventoryId;
    const qty = Number(quantity) || 1;

    if (!rid || !iid || qty <= 0) {
      return res
        .status(400)
        .json({ message: "repair_id, inventory_id, and positive quantity are required" });
    }

    try {
      const result = await sequelize.transaction(async (t) => {
        const repair = await db.Repair.findByPk(rid, { transaction: t });
        if (!repair) throw new Error("REPAIR_NOT_FOUND");
        if (repair.isLocked) throw new Error("BILL_LOCKED");

        const inventory = await db.Inventory.findByPk(iid, { transaction: t });
        if (!inventory || !inventory.isActive) throw new Error("INVENTORY_NOT_FOUND");
        if (inventory.quantity < qty) throw new Error("INSUFFICIENT_STOCK");

        await inventory.decrement("quantity", { by: qty, transaction: t });
        await inventory.reload({ transaction: t });
        if (inventory.quantity < 0) throw new Error("STOCK_WENT_NEGATIVE");

        const usage = await db.InventoryUsage.create(
          {
            repairId: rid,
            inventoryId: iid,
            quantityUsed: qty,
            unitPriceAtUse: inventory.unitPrice,
            createdByUserId: req.user.id,
          },
          { transaction: t }
        );

        const chargeAmount = Number(inventory.unitPrice) * qty;
        const desc = notes
          ? `${inventory.name} x${qty} (${notes})`
          : `${inventory.name} x${qty}`;

        const charge = await db.RepairCharge.create(
          {
            repairId: rid,
            type: "INVENTORY",
            description: desc,
            amount: chargeAmount,
            sourceInventoryUsageId: usage.id,
            createdByUserId: req.user.id,
          },
          { transaction: t }
        );

        await recalcRepairTotals(rid, t);

        await logAudit(
          {
            userId: req.user.id,
            repairId: rid,
            entityType: "Inventory",
            entityId: usage.id,
            action: "INVENTORY_ASSIGNED_TO_REPAIR",
            metadata: { inventoryId: iid, quantity: qty, notes },
          },
          t
        );

        return { usage, charge };
      });

      res.status(201).json(result);
    } catch (err) {
      console.error("Assign to repair error", err);
      if (err.message === "REPAIR_NOT_FOUND" || err.message === "INVENTORY_NOT_FOUND") {
        return res.status(404).json({ message: "Repair or inventory not found" });
      }
      if (err.message === "BILL_LOCKED") {
        return res.status(400).json({ message: "Repair bill is locked" });
      }
      if (err.message === "INSUFFICIENT_STOCK" || err.message === "STOCK_WENT_NEGATIVE") {
        return res.status(400).json({ message: "Insufficient inventory" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

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

// Return active SKUs for use in technician workflows (readable by users with repair view)
router.get("/skus", authorize([PERMISSIONS.REPAIR_VIEW]), async (req, res) => {
  try {
    const items = await db.Inventory.findAll({
      where: { isActive: true },
      attributes: ["sku", "name", "quantity", "unitPrice"],
      order: [["sku", "ASC"]],
    });
    const skus = (items || []).map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })).filter(x => x.sku);
    res.json(skus);
  } catch (err) {
    console.error("Inventory skus error", err);
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


import express from "express";
import { prisma } from "../prisma.js";
import {
  ALLOWED_STATUS_TRANSITIONS,
  PERMISSIONS,
  REPAIR_STATUS,
} from "../config.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";

const router = express.Router();

const generateQrToken = () =>
  Math.random().toString(36).substring(2, 10) +
  Math.random().toString(36).substring(2, 10);

const recalcRepairTotals = async (repairId, db = prisma) => {
  // db can be a transaction client (tx) so callers inside a $transaction
  // pass the tx to ensure the update sees uncommitted records.
  const charges = await db.repairCharge.findMany({
    where: { repairId },
  });
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0);

  await db.repair.update({
    where: { id: repairId },
    data: {
      totalCharges,
    },
  });
};

router.use(authenticate);

// Intake a new repair (customer + device + repair)
router.post(
  "/intake",
  authorize([PERMISSIONS.INTAKE_REPAIR]),
  async (req, res) => {
    const { customer, device, intakeNotes, flatChargeAmount = 0 } = req.body;

    if (!customer?.name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        let customerRecord;

        if (customer.id) {
          customerRecord = await tx.customer.findUnique({
            where: { id: customer.id },
          });
        }

        if (!customerRecord) {
          customerRecord = await tx.customer.create({
            data: {
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              address: customer.address,
            },
          });
        }

        const deviceRecord = await tx.device.create({
          data: {
            customerId: customerRecord.id,
            categoryId: device?.categoryId || null,
            brand: device?.brand || null,
            model: device?.model || null,
            serialNumber: device?.serialNumber || null,
            description: device?.description || null,
          },
        });

        const qrToken = generateQrToken();

        const repair = await tx.repair.create({
          data: {
            customerId: customerRecord.id,
            deviceId: deviceRecord.id,
            status: REPAIR_STATUS.INTAKE,
            qrToken,
            intakeNotes: intakeNotes || null,
            flatChargeAmount: flatChargeAmount || 0,
          },
        });

        if (flatChargeAmount > 0) {
          await tx.repairCharge.create({
            data: {
              repairId: repair.id,
              type: "FLAT",
              description: "Intake flat charge",
              amount: flatChargeAmount,
              createdByUserId: req.user.id,
            },
          });
        }

        // Recalculate using the transaction client so the newly-created
        // repair and charges are visible to the update.
        await recalcRepairTotals(repair.id, tx);

        await logAudit(
          {
            userId: req.user.id,
            repairId: repair.id,
            entityType: "Repair",
            entityId: repair.id,
            action: "INTAKE_CREATED",
            metadata: { intakeNotes, flatChargeAmount },
          },
          tx
        );

        return { repair, customer: customerRecord, device: deviceRecord };
      });

      res.status(201).json(result);
    } catch (err) {
      console.error("Intake error", err);
      // Surface the error message and code in dev to help debugging the client.
      const payload = { message: err.message || "Internal server error" };
      if (err.code) payload.code = err.code;
      res.status(500).json(payload);
    }
  }
);

// Transition repair status with lifecycle enforcement
router.post(
  "/:id/transition",
  authorize([PERMISSIONS.UPDATE_REPAIR_STATUS]),
  async (req, res) => {
    const { id } = req.params;
    const { newStatus } = req.body;

    if (!Object.values(REPAIR_STATUS).includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      const repair = await prisma.repair.findUnique({ where: { id } });
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      const allowed = ALLOWED_STATUS_TRANSITIONS[repair.status] || [];
      if (!allowed.includes(newStatus)) {
        return res.status(400).json({
          message: `Invalid status transition from ${repair.status} to ${newStatus}`,
        });
      }

      const updateData = { status: newStatus };
      const now = new Date();

      if (repair.status === REPAIR_STATUS.INTAKE && newStatus === REPAIR_STATUS.TO_REPAIR) {
        updateData["toRepairAt"] = now;
      }
      if (newStatus === REPAIR_STATUS.IN_REPAIR) {
        updateData["inRepairAt"] = now;
      }
      if (newStatus === REPAIR_STATUS.REPAIRED || newStatus === REPAIR_STATUS.UNREPAIRABLE) {
        updateData["completedAt"] = now;
      }
      if (newStatus === REPAIR_STATUS.DELIVERED) {
        updateData["deliveredAt"] = now;
      }

      const updated = await prisma.repair.update({
        where: { id },
        data: updateData,
      });

      await logAudit({
        userId: req.user.id,
        repairId: id,
        entityType: "Repair",
        entityId: id,
        action: "STATUS_CHANGED",
        metadata: { from: repair.status, to: newStatus },
      });

      res.json(updated);
    } catch (err) {
      console.error("Transition error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Use inventory on a repair: atomically decrement stock, create usage and charge
router.post(
  "/:id/use-inventory",
  authorize([PERMISSIONS.USE_INVENTORY]),
  async (req, res) => {
    const { id } = req.params;
    const { inventoryId, quantity } = req.body;

    if (!inventoryId || !quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ message: "inventoryId and positive quantity are required" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const repair = await tx.repair.findUnique({ where: { id } });
        if (!repair) {
          throw new Error("REPAIR_NOT_FOUND");
        }
        if (repair.isLocked) {
          throw new Error("BILL_LOCKED");
        }

        const inventory = await tx.inventory.findUnique({
          where: { id: inventoryId },
        });
        if (!inventory || !inventory.isActive) {
          throw new Error("INVENTORY_NOT_FOUND");
        }
        if (inventory.quantity < quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const updatedInventory = await tx.inventory.update({
          where: { id: inventoryId },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        if (updatedInventory.quantity < 0) {
          throw new Error("STOCK_WENT_NEGATIVE");
        }

        const usage = await tx.inventoryUsage.create({
          data: {
            repairId: id,
            inventoryId,
            quantityUsed: quantity,
            unitPriceAtUse: inventory.unitPrice,
            createdByUserId: req.user.id,
          },
        });

        const chargeAmount = Number(inventory.unitPrice) * quantity;

        const charge = await tx.repairCharge.create({
          data: {
            repairId: id,
            type: "INVENTORY",
            description: `${inventory.name} x${quantity}`,
            amount: chargeAmount,
            sourceInventoryUsageId: usage.id,
            createdByUserId: req.user.id,
          },
        });

        // Use the transaction client so the update can see the usage and charge
        // created earlier in this transaction.
        await recalcRepairTotals(id, tx);

        await logAudit(
          {
            userId: req.user.id,
            repairId: id,
            entityType: "Repair",
            entityId: id,
            action: "INVENTORY_USED",
            metadata: { inventoryId, quantity, chargeAmount },
          },
          tx
        );

        return { usage, charge };
      });

      res.status(201).json(result);
    } catch (err) {
      console.error("Use inventory error", err);
      if (
        err.message === "REPAIR_NOT_FOUND" ||
        err.message === "INVENTORY_NOT_FOUND"
      ) {
        return res.status(404).json({ message: "Repair or inventory not found" });
      }
      if (err.message === "BILL_LOCKED") {
        return res.status(400).json({ message: "Repair bill is locked" });
      }
      if (
        err.message === "INSUFFICIENT_STOCK" ||
        err.message === "STOCK_WENT_NEGATIVE"
      ) {
        return res.status(400).json({ message: "Insufficient inventory" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Add a manual charge (e.g. labor)
router.post(
  "/:id/add-charge",
  authorize([PERMISSIONS.MANAGE_BILLING]),
  async (req, res) => {
    const { id } = req.params;
    const { type = "OTHER", description, amount } = req.body;

    if (!description || !amount || amount === 0) {
      return res
        .status(400)
        .json({ message: "description and non-zero amount are required" });
    }

    try {
      const repair = await prisma.repair.findUnique({ where: { id } });
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      if (repair.isLocked) {
        return res.status(400).json({ message: "Repair bill is locked" });
      }

      const charge = await prisma.repairCharge.create({
        data: {
          repairId: id,
          type,
          description,
          amount,
          createdByUserId: req.user.id,
        },
      });

      await recalcRepairTotals(id);

      await logAudit({
        userId: req.user.id,
        repairId: id,
        entityType: "Repair",
        entityId: id,
        action: "CHARGE_ADDED",
        metadata: { type, description, amount },
      });

      res.status(201).json(charge);
    } catch (err) {
      console.error("Add charge error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Record a payment and lock bill
router.post(
  "/:id/pay",
  authorize([PERMISSIONS.TAKE_PAYMENT]),
  async (req, res) => {
    const { id } = req.params;
    const { amount, method } = req.body;

    if (!amount || amount <= 0 || !method) {
      return res
        .status(400)
        .json({ message: "Positive amount and method are required" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const repair = await tx.repair.findUnique({
          where: { id },
          include: { payments: true },
        });
        if (!repair) {
          throw new Error("REPAIR_NOT_FOUND");
        }

        const paidSoFar = repair.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );
        const total = Number(repair.totalCharges);
        if (paidSoFar + amount > total) {
          throw new Error("OVERPAYMENT");
        }

        const payment = await tx.payment.create({
          data: {
            repairId: id,
            amount,
            method,
            receivedByUserId: req.user.id,
          },
        });

        const newPaid = paidSoFar + amount;
        const shouldLock = newPaid >= total;

        let staffShareAmount = repair.staffShareAmount;
        let shopShareAmount = repair.shopShareAmount;

        if (shouldLock) {
          const staffRate = Number(
            (await tx.user.findUnique({ where: { id: req.user.id } }))
              .commissionRate
          );
          staffShareAmount = total * staffRate;
          shopShareAmount = total - staffShareAmount;
        }

        const updatedRepair = await tx.repair.update({
          where: { id },
          data: {
            isLocked: shouldLock,
            staffShareAmount,
            shopShareAmount,
          },
        });

        await logAudit(
          {
            userId: req.user.id,
            repairId: id,
            entityType: "Repair",
            entityId: id,
            action: "PAYMENT_RECEIVED",
            metadata: { amount, method, newPaid, total, locked: shouldLock },
          },
          tx
        );

        return { payment, repair: updatedRepair };
      });

      res.status(201).json(result);
    } catch (err) {
      console.error("Payment error", err);
      if (err.message === "REPAIR_NOT_FOUND") {
        return res.status(404).json({ message: "Repair not found" });
      }
      if (err.message === "OVERPAYMENT") {
        return res.status(400).json({ message: "Payment exceeds total due" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get billing summary for a repair
router.get(
  "/:id/billing",
  authorize([PERMISSIONS.MANAGE_BILLING, PERMISSIONS.TAKE_PAYMENT]),
  async (req, res) => {
    const { id } = req.params;
    try {
      const repair = await prisma.repair.findUnique({
        where: { id },
        include: {
          charges: true,
          payments: true,
        },
      });
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      const total = Number(repair.totalCharges);
      const paid = repair.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const due = total - paid;

      res.json({
        repairId: repair.id,
        total,
        paid,
        due,
        isLocked: repair.isLocked,
        charges: repair.charges,
        payments: repair.payments,
      });
    } catch (err) {
      console.error("Billing error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get queue of repairs by status (e.g. TO_REPAIR)
router.get(
  "/queue",
  authorize([PERMISSIONS.UPDATE_REPAIR_STATUS]),
  async (req, res) => {
    const { status } = req.query;
    if (!status) {
      return res.status(400).json({ message: "Valid status query is required" });
    }

    // Accept comma-separated statuses (e.g. "INTAKE,TO_REPAIR")
    const statusList = String(status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Validate statuses
    const validStatuses = Object.values(REPAIR_STATUS);
    const invalid = statusList.some((s) => !validStatuses.includes(s));
    if (invalid) {
      return res.status(400).json({ message: "One or more invalid statuses" });
    }

    try {
      const repairs = await prisma.repair.findMany({
        where: { status: { in: statusList } },
        orderBy: { createdAt: "asc" },
        include: {
          customer: true,
          device: true,
        },
      });
      console.log(`Queue: requested statuses=${statusList.join(",")} -> found=${repairs.length}`);
      res.json(repairs);
    } catch (err) {
      console.error("Queue error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Lookup repair by QR token
router.get(
  "/by-qr/:token",
  authorize([PERMISSIONS.UPDATE_REPAIR_STATUS, PERMISSIONS.MANAGE_BILLING]),
  async (req, res) => {
    const { token } = req.params;
    try {
      const repair = await prisma.repair.findUnique({
        where: { qrToken: token },
        include: { customer: true, device: true },
      });
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      res.json(repair);
    } catch (err) {
      console.error("by-qr error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get single repair with full details
router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const repair = await prisma.repair.findUnique({
      where: { id },
      include: {
        customer: true,
        device: true,
        charges: true,
        payments: true,
        inventoryUsage: {
          include: { inventory: true },
        },
      },
    });
    if (!repair) {
      return res.status(404).json({ message: "Repair not found" });
    }
    res.json(repair);
  } catch (err) {
    console.error("Get repair error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;


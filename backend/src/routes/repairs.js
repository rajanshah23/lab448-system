import express from "express";
import { Op } from "sequelize";
import db, { sequelize } from "../db.js";
import {
  ALLOWED_STATUS_TRANSITIONS,
  PERMISSIONS,
  REPAIR_STATUS,
} from "../config.js";
import { getFrontdeskCharge } from "../chargesConfig.js";
import { SMS_MESSAGES, formatSmsMessage } from "../config.js";
import { sendSms } from "../services/aakashSms.js";
import {
  authenticate,
  authorize,
  checkPermission,
} from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";

const router = express.Router();

/**
 * Generates a unique human-readable QR token: LAB + YYMMDD + 4-digit daily sequence (e.g. LAB2501310001).
 * Date key is derived from server Date.now() (YYMMDD). Sequence resets per day. Must be called inside a transaction.
 * @param {import("sequelize").Transaction} transaction
 * @returns {Promise<string>}
 */
async function generateQrToken(transaction) {
  const d = new Date();
  const dateKey =
    String(d.getFullYear()).slice(-2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  await db.QrDailySequence.findOrCreate({
    where: { dateKey },
    defaults: { lastValue: 0 },
    transaction,
  });
  const row = await db.QrDailySequence.findOne({
    where: { dateKey },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  const nextVal = (row.lastValue ?? 0) + 1;
  await row.update({ lastValue: nextVal }, { transaction });
  return `LAB${dateKey}${String(nextVal).padStart(4, "0")}`;
}

const recalcRepairTotals = async (repairId, transaction = null) => {
  const charges = await db.RepairCharge.findAll({
    where: { repairId },
    transaction,
  });
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0);

  await db.Repair.update(
    { totalCharges },
    { where: { id: repairId }, transaction },
  );
};

router.use(authenticate);

// Search repairs that have inventory usage for the given SKU
router.get(
  "/by-sku",
  authorize([PERMISSIONS.REPAIR_VIEW]),
  async (req, res) => {
    const sku = (req.query.sku || "").toString().trim();
    if (!sku)
      return res
        .status(400)
        .json({ message: "sku query parameter is required" });
    try {
      const inventory = await db.Inventory.findOne({ where: { sku } });
      if (!inventory)
        return res.status(404).json({ message: "Inventory not found" });

      const usages = await db.InventoryUsage.findAll({
        where: { inventoryId: inventory.id },
        include: [
          {
            model: db.Repair,
            as: "repair",
            include: [
              { model: db.Customer, as: "customer" },
              { model: db.Device, as: "device" },
            ],
          },
        ],
      });

      const repairs = usages
        .map((u) => u.repair)
        .filter((r) => !!r)
        .map((r) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt,
          qrToken: r.qrToken,
          customer: r.customer,
          device: r.device,
        }));

      res.json(repairs);
    } catch (err) {
      console.error("Repairs by SKU error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Return SKU list for visible repairs in queue (grouped by repair) so technicians can copy barcodes
router.get(
  "/queue-skus",
  authorize([PERMISSIONS.REPAIR_VIEW]),
  async (req, res) => {
    try {
      const statusParam = (req.query.status || "").toString().trim();
      const statuses = statusParam
        ? statusParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

      const where = {};
      if (statuses && statuses.length) where.status = { [Op.in]: statuses };

      const repairs = await db.Repair.findAll({
        where,
        include: [
          {
            model: db.InventoryUsage,
            as: "inventoryUsage",
            include: [{ model: db.Inventory, as: "inventory" }],
          },
          { model: db.Customer, as: "customer" },
          { model: db.Device, as: "device" },
        ],
        order: [["createdAt", "ASC"]],
      });

      const result = repairs.map((r) => ({
        repairId: r.id,
        qrToken: r.qrToken,
        status: r.status,
        createdAt: r.createdAt,
        skus: (r.inventoryUsage || [])
          .map((u) => ({
            sku: u.inventory?.sku || null,
            name: u.inventory?.name || null,
          }))
          .filter((x) => x.sku),
      }));

      res.json(result);
    } catch (err) {
      console.error("Queue SKUs error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Intake a new repair (customer + device + repair)
router.post(
  "/intake",
  authorize([PERMISSIONS.INTAKE_REPAIR]),
  async (req, res) => {
    const {
      customer,
      device,
      intakeNotes,
      flatChargeAmount: bodyFlatCharge,
      repairCategoryId,
    } = req.body;

    if (!customer?.name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    try {
      let flatChargeAmount = Number(bodyFlatCharge || 0);
      let categoryRecord = null;

      if (repairCategoryId) {
        categoryRecord = await db.RepairCategory.findByPk(repairCategoryId);
        if (!categoryRecord) {
          return res.status(400).json({ message: "Invalid repair category" });
        }
        if (categoryRecord.level !== 3) {
          return res.status(400).json({
            message: "Please select a Category Level 3 (leaf) for flat rate",
          });
        }
        const rate =
          categoryRecord.flatRate != null ? Number(categoryRecord.flatRate) : 0;
        if (rate > 0) flatChargeAmount = rate;
      }

      const result = await sequelize.transaction(async (t) => {
        let customerRecord;

        if (customer.id) {
          customerRecord = await db.Customer.findByPk(customer.id, {
            transaction: t,
          });
        }

        if (!customerRecord) {
          const hasPrimaryPhone =
            customer.phone != null && String(customer.phone).trim() !== "";
          if (!hasPrimaryPhone) {
            throw new Error("CUSTOMER_PRIMARY_PHONE_REQUIRED");
          }
          customerRecord = await db.Customer.create(
            {
              name: customer.name,
              phone: customer.phone,
              phone2: customer.phone2,
              email: customer.email,
              address: customer.address,
            },
            { transaction: t },
          );
        }

        const deviceRecord = await db.Device.create(
          {
            customerId: customerRecord.id,
            categoryId: device?.categoryId || null,
            brand: device?.brand || null,
            model: device?.model || null,
            serialNumber: device?.serialNumber || null,
            description: device?.description || null,
          },
          { transaction: t },
        );

        const qrToken = await generateQrToken(t);

        const repair = await db.Repair.create(
          {
            customerId: customerRecord.id,
            deviceId: deviceRecord.id,
            status: REPAIR_STATUS.INTAKE,
            qrToken,
            intakeNotes: intakeNotes || null,
            repairCategoryId: categoryRecord?.id || null,
            flatChargeAmount: flatChargeAmount || 0,
          },
          { transaction: t },
        );

        if (flatChargeAmount > 0) {
          // Use the Service Ticket Charge description for intake flat charges so the ticket fee
          // is shown consistently in the billing UI (frontend will treat this as the ticket charge)
          const desc = "Service Ticket Charge";
          await db.RepairCharge.create(
            {
              repairId: repair.id,
              type: "FLAT",
              description: desc,
              amount: flatChargeAmount,
              createdByUserId: req.user.id,
            },
            { transaction: t },
          );
        }

        const frontdeskCharge = getFrontdeskCharge();
        if (frontdeskCharge > 0) {
          await db.RepairCharge.create(
            {
              repairId: repair.id,
              type: "FLAT",
              description: "Front desk charge",
              amount: frontdeskCharge,
              createdByUserId: req.user.id,
            },
            { transaction: t },
          );
        }

        await recalcRepairTotals(repair.id, t);

        await logAudit(
          {
            userId: req.user.id,
            repairId: repair.id,
            entityType: "Repair",
            entityId: repair.id,
            action: "INTAKE_CREATED",
            metadata: {
              intakeNotes,
              flatChargeAmount,
              repairCategoryId: categoryRecord?.id,
              frontdeskCharge,
            },
          },
          t,
        );

        return { repair, customer: customerRecord, device: deviceRecord };
      });

      // Send intake SMS once (non-blocking for API response; errors logged only)
      try {
        const phone = result.customer?.phone;
        if (phone) {
          const text = formatSmsMessage(SMS_MESSAGES.INTAKE, {
            customerName: result.customer.name,
            qrToken: result.repair.qrToken,
            date: new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          });
          const smsResult = await sendSms(phone, text);
          if (smsResult.success) {
            await result.repair.update({ smsIntakeSentAt: new Date() });
          } else {
            console.warn("Intake SMS not sent:", smsResult.error);
          }
        }
      } catch (smsErr) {
        console.error("Intake SMS error:", smsErr);
      }

      res.status(201).json(result);
    } catch (err) {
      console.error("Intake error", err);
      if (err.message === "CUSTOMER_PRIMARY_PHONE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Please fill your primary phone number" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  },
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
      const repair = await db.Repair.findByPk(id, {
        include: [{ model: db.Customer, as: "customer" }],
      });
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

      if (
        repair.status === REPAIR_STATUS.INTAKE &&
        newStatus === REPAIR_STATUS.TO_REPAIR
      ) {
        updateData.toRepairAt = now;
      }
      if (newStatus === REPAIR_STATUS.IN_REPAIR && !repair.inRepairAt) {
        updateData.inRepairAt = now;
      }

      if (
        newStatus === REPAIR_STATUS.REPAIRED ||
        newStatus === REPAIR_STATUS.UNREPAIRABLE
      ) {
        updateData.completedAt = now;
      }

      if (newStatus === REPAIR_STATUS.DELIVERED) {
        updateData.deliveredAt = now;
      }

      await repair.update(updateData);

      await logAudit({
        userId: req.user.id,
        repairId: id,
        entityType: "Repair",
        entityId: id,
        action: "STATUS_CHANGED",
        metadata: { from: repair.status, to: newStatus },
      });

      // Send repaired SMS once when status becomes REPAIRED or UNREPAIRABLE
      const shouldSendRepairedSms =
        (newStatus === REPAIR_STATUS.REPAIRED ||
          newStatus === REPAIR_STATUS.UNREPAIRABLE) &&
        !repair.smsRepairedSentAt &&
        repair.customer?.phone;
      if (shouldSendRepairedSms) {
        try {
          const template =
            newStatus === REPAIR_STATUS.UNREPAIRABLE
              ? SMS_MESSAGES.UNREPAIRABLE
              : SMS_MESSAGES.REPAIRED;
          const text = formatSmsMessage(template, {
            customerName: repair.customer.name,
            qrToken: repair.qrToken,
            date: new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          });
          const smsResult = await sendSms(repair.customer.phone, text);
          if (smsResult.success) {
            await repair.update({ smsRepairedSentAt: now });
          } else {
            console.warn("Repaired SMS not sent:", smsResult.error);
          }
        } catch (smsErr) {
          console.error("Repaired SMS error:", smsErr);
        }
      }

      const updated = await db.Repair.findByPk(id, {
        include: [{ model: db.Customer, as: "customer" }],
      });
      res.json(updated || repair);
    } catch (err) {
      console.error("Transition error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Use inventory on a repair: atomically decrement stock, create usage and charge
// Body: inventoryId (optional) OR itemKey (id or sku), and quantity
router.post(
  "/:id/use-inventory",
  authorize([PERMISSIONS.USE_INVENTORY]),
  async (req, res) => {
    const { id } = req.params;
    const { inventoryId, itemKey, quantity } = req.body;

    const hasId = inventoryId != null && String(inventoryId).trim() !== "";
    const hasKey = itemKey != null && String(itemKey).trim() !== "";
    if ((!hasId && !hasKey) || !quantity || quantity <= 0) {
      return res.status(400).json({
        message:
          "inventoryId or itemKey (id/sku), and positive quantity are required",
      });
    }

    try {
      const result = await sequelize.transaction(async (t) => {
        const repair = await db.Repair.findByPk(id, { transaction: t });
        if (!repair) {
          throw new Error("REPAIR_NOT_FOUND");
        }
        if (repair.isLocked) {
          throw new Error("BILL_LOCKED");
        }

        let inventory;
        if (hasId) {
          inventory = await db.Inventory.findByPk(inventoryId, {
            transaction: t,
          });
        } else {
          const key = String(itemKey).trim();
          inventory = await db.Inventory.findOne({
            where: { isActive: true, [Op.or]: [{ id: key }, { sku: key }] },
            transaction: t,
          });
        }
        if (!inventory || !inventory.isActive) {
          throw new Error("INVENTORY_NOT_FOUND");
        }
        if (inventory.quantity < quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        await inventory.decrement("quantity", { by: quantity, transaction: t });
        await inventory.reload({ transaction: t });

        if (inventory.quantity < 0) {
          throw new Error("STOCK_WENT_NEGATIVE");
        }

        const resolvedInventoryId = inventory.id;
        const usage = await db.InventoryUsage.create(
          {
            repairId: id,
            inventoryId: resolvedInventoryId,
            quantityUsed: quantity,
            unitPriceAtUse: inventory.unitPrice,
            createdByUserId: req.user.id,
          },
          { transaction: t },
        );

        const chargeAmount = Number(inventory.unitPrice) * quantity;

        const charge = await db.RepairCharge.create(
          {
            repairId: id,
            type: "INVENTORY",
            description: `${inventory.name} x${quantity}`,
            amount: chargeAmount,
            sourceInventoryUsageId: usage.id,
            createdByUserId: req.user.id,
          },
          { transaction: t },
        );

        await recalcRepairTotals(id, t);

        await logAudit(
          {
            userId: req.user.id,
            repairId: id,
            entityType: "Repair",
            entityId: id,
            action: "INVENTORY_USED",
            metadata: {
              inventoryId: resolvedInventoryId,
              quantity,
              chargeAmount,
            },
          },
          t,
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
        return res
          .status(404)
          .json({ message: "Repair or inventory not found" });
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
  },
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
      const repair = await db.Repair.findByPk(id);
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      if (repair.isLocked) {
        return res.status(400).json({ message: "Repair bill is locked" });
      }

      const charge = await db.RepairCharge.create({
        repairId: id,
        type,
        description,
        amount,
        createdByUserId: req.user.id,
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
  },
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
      const result = await sequelize.transaction(async (t) => {
        const repair = await db.Repair.findByPk(id, {
          include: [{ model: db.Payment, as: "payments" }],
          transaction: t,
        });
        if (!repair) {
          throw new Error("REPAIR_NOT_FOUND");
        }

        const paidSoFar = repair.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const total = Number(repair.totalCharges);
        if (paidSoFar + amount > total) {
          throw new Error("OVERPAYMENT");
        }

        const payment = await db.Payment.create(
          {
            repairId: id,
            amount,
            method,
            receivedByUserId: req.user.id,
          },
          { transaction: t },
        );

        const newPaid = paidSoFar + amount;
        const shouldLock = newPaid >= total;

        let staffShareAmount = repair.staffShareAmount;
        let shopShareAmount = repair.shopShareAmount;

        if (shouldLock) {
          let staffRate = 0;
          if (repair.assignedToUserId) {
            const technician = await db.User.findByPk(repair.assignedToUserId, {
              include: [{ model: db.Role, as: "role" }],
              transaction: t,
            });
            if (
              technician?.role?.code === "TECHNICIAN" &&
              technician.commissionRate != null
            ) {
              staffRate = Number(technician.commissionRate);
            }
          }
          staffShareAmount = total * staffRate;
          shopShareAmount = total - staffShareAmount;
        }

        await repair.update(
          {
            isLocked: shouldLock,
            staffShareAmount,
            shopShareAmount,
          },
          { transaction: t },
        );

        await logAudit(
          {
            userId: req.user.id,
            repairId: id,
            entityType: "Repair",
            entityId: id,
            action: "PAYMENT_RECEIVED",
            metadata: { amount, method, newPaid, total, locked: shouldLock },
          },
          t,
        );

        return { payment, repair };
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
  },
);

// Literal routes first so /queue and /by-qr are not matched by /:id
// Get queue of repairs by status (e.g. TO_REPAIR)
router.get(
  "/queue",
  authorize([PERMISSIONS.UPDATE_REPAIR_STATUS]),
  async (req, res) => {
    const { status } = req.query;
    if (!status) {
      return res
        .status(400)
        .json({ message: "Valid status query is required" });
    }

    const statusList = String(status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const validStatuses = Object.values(REPAIR_STATUS);
    const invalid = statusList.some((s) => !validStatuses.includes(s));
    if (invalid) {
      return res.status(400).json({ message: "One or more invalid statuses" });
    }

    try {
      const repairs = await db.Repair.findAll({
        where: { status: { [Op.in]: statusList } },
        include: [
          {
            model: db.Customer,
            as: "customer",
            attributes: [
              "id",
              "name",
              "phone",
              "email",
              "address",
              "createdAt",
              "updatedAt",
            ],
          },
          { model: db.Device, as: "device" },
        ],
        order: [["createdAt", "ASC"]],
      });
      res.json(repairs);
    } catch (err) {
      console.error("Queue error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Lookup repair by QR token
router.get(
  "/by-qr/:token",
  checkPermission([
    PERMISSIONS.UPDATE_REPAIR_STATUS,
    PERMISSIONS.MANAGE_BILLING,
  ]),
  async (req, res) => {
    const { token } = req.params;
    try {
      const repair = await db.Repair.findOne({
        where: { qrToken: token },
        include: [
          {
            model: db.Customer,
            as: "customer",
            attributes: [
              "id",
              "name",
              "phone",
              "email",
              "address",
              "createdAt",
              "updatedAt",
            ],
          },
          { model: db.Device, as: "device" },
        ],
      });
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      res.json(repair);
    } catch (err) {
      console.error("by-qr error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Get billing summary for a repair
router.get(
  "/:id/billing",
  authorize([PERMISSIONS.MANAGE_BILLING, PERMISSIONS.TAKE_PAYMENT]),
  async (req, res) => {
    const { id } = req.params;
    try {
      const repair = await db.Repair.findByPk(id, {
        include: [
          { model: db.RepairCharge, as: "charges" },
          { model: db.Payment, as: "payments" },
        ],
      });
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      const total = Number(repair.totalCharges);
      const paid = repair.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
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
  },
);

// Get single repair with full details
router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const repair = await db.Repair.findByPk(id, {
      include: [
        { model: db.Customer, as: "customer" },
        { model: db.Device, as: "device" },
        { model: db.RepairCategory, as: "repairCategory" },
        { model: db.RepairCharge, as: "charges" },
        { model: db.Payment, as: "payments" },
        {
          model: db.InventoryUsage,
          as: "inventoryUsage",
          include: [{ model: db.Inventory, as: "inventory" }],
        },
      ],
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

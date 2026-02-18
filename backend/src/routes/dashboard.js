import express from "express";
import { Op } from "sequelize";
import db, { sequelize } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { checkPermission, requireRole } from "../middleware/checkPermission.js";
import { REPAIR_STATUS } from "../config.js";

const router = express.Router();
const LOW_STOCK_THRESHOLD = 5;

router.use(authenticate);

// Helper: technician or admin
const techOrAdmin = requireRole(["TECHNICIAN", "ADMIN"]);
const fdOrAdmin = requireRole(["FRONT_DESK", "ADMIN"]);
const logOrAdmin = requireRole(["LOGISTICS", "ADMIN"]);
const finOrAdmin = requireRole(["FINANCE", "ADMIN"]);
const mgrOrAdmin = requireRole(["MANAGER", "ADMIN"]);
const adminOnly = requireRole(["ADMIN"]);

// GET /api/dashboard/technician
router.get("/technician", techOrAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    console.log(`Technician dashboard requested for user ID: ${userId}`);

    // ========== FIXED: Get repairs assigned to this technician ==========
    const assignedRepairs = await db.Repair.findAll({
      where: { assignedToUserId: userId },
      include: [
        {
          model: db.Customer,
          as: "customer",
          attributes: ["id", "name", "phone"],
        },
        {
          model: db.Device,
          as: "device",
          attributes: ["id", "brand", "model", "description"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    console.log(`Found ${assignedRepairs.length} assigned repairs`);

    // ========== FIXED: Get repairs where technician used inventory using correct column name ==========
    let inventoryRepairs = [];
    try {
      // Find all inventory usage records created by this technician
      const usageRecords = await db.InventoryUsage.findAll({
        where: { createdByUserId: userId },
        include: [
          {
            model: db.Repair,
            as: "repair",
            include: [
              {
                model: db.Customer,
                as: "customer",
                attributes: ["id", "name", "phone"],
              },
              {
                model: db.Device,
                as: "device",
                attributes: ["id", "brand", "model", "description"],
              },
            ],
          },
        ],
      });

      // Extract unique repairs from usage records
      const repairMap = new Map();
      usageRecords.forEach((usage) => {
        if (usage.repair) {
          repairMap.set(usage.repair.id, usage.repair);
        }
      });

      inventoryRepairs = Array.from(repairMap.values());
      console.log(
        `Found ${inventoryRepairs.length} repairs with inventory usage by this technician`,
      );
    } catch (err) {
      console.log("Error fetching inventory repairs:", err.message);
    }

    // Combine assigned and inventory repairs (remove duplicates)
    const allRepairsMap = new Map();
    [...assignedRepairs, ...inventoryRepairs].forEach((repair) => {
      if (repair && repair.id) {
        allRepairsMap.set(repair.id, repair);
      }
    });
    const myRepairs = Array.from(allRepairsMap.values());

    console.log(`Total unique repairs found: ${myRepairs.length}`);

    // Log each repair found for debugging
    myRepairs.forEach((repair) => {
      console.log(
        `Repair: ${repair.id}, Status: ${repair.status}, Assigned: ${repair.assignedToUserId}`,
      );
    });
    // ========== END FIXED ==========

    const inProgress = myRepairs.filter((r) =>
      ["TO_REPAIR", "IN_REPAIR"].includes(r.status),
    );

    // Calculate completed repairs for this month
    const completedThisMonth = myRepairs.filter((r) => {
      const isCompleted = ["REPAIRED", "UNREPAIRABLE", "DELIVERED"].includes(
        r.status,
      );
      if (!isCompleted) return false;

      const completionDate = r.completedAt || r.updatedAt;
      return completionDate && new Date(completionDate) >= monthStart;
    }).length;

    // Calculate success rate
    const monthCompletedRepairs = myRepairs.filter((r) => {
      const isCompleted = ["REPAIRED", "UNREPAIRABLE"].includes(r.status);
      if (!isCompleted) return false;

      const completionDate = r.completedAt || r.updatedAt;
      return completionDate && new Date(completionDate) >= monthStart;
    });

    const totalMonthCompleted = monthCompletedRepairs.length;
    const monthRepairedCount = monthCompletedRepairs.filter(
      (r) => r.status === "REPAIRED",
    ).length;
    const successRate =
      totalMonthCompleted > 0
        ? (monthRepairedCount / totalMonthCompleted) * 100
        : 0;

    // Get completed repairs with timestamps for earnings
    const completedRepairs = myRepairs.filter((r) => {
      const isCompleted = ["REPAIRED", "UNREPAIRABLE", "DELIVERED"].includes(
        r.status,
      );
      if (!isCompleted) return false;

      const completionDate = r.completedAt || r.updatedAt;
      return (
        completionDate && new Date(completionDate) >= monthStart && r.isLocked
      );
    });

    const totalEarnings = completedRepairs.reduce(
      (sum, r) => sum + Number(r.staffShareAmount || 0),
      0,
    );

    let avgCompletionHours = 0;
    const withTimes = completedRepairs.filter(
      (r) => r.inRepairAt && (r.completedAt || r.updatedAt),
    );
    if (withTimes.length > 0) {
      const totalHours = withTimes.reduce((sum, r) => {
        const endDate = r.completedAt || r.updatedAt;
        const h =
          (new Date(endDate) - new Date(r.inRepairAt)) / (1000 * 60 * 60);
        return sum + h;
      }, 0);
      avgCompletionHours =
        Math.round((totalHours / withTimes.length) * 10) / 10;
    }

    // Performance trend
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trendRepairs = myRepairs.filter((r) => {
      const isCompleted = ["REPAIRED", "UNREPAIRABLE", "DELIVERED"].includes(
        r.status,
      );
      if (!isCompleted) return false;

      const completionDate = r.completedAt || r.updatedAt;
      return completionDate && new Date(completionDate) >= sixMonthsAgo;
    });

    const byMonth = {};
    trendRepairs.forEach((r) => {
      const completionDate = r.completedAt || r.updatedAt;
      const d = new Date(completionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    const performanceTrend = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, repairsCompleted: count }));

    // Get pending repairs (unassigned)
    const pendingRepairs = await db.Repair.findAll({
      where: {
        assignedToUserId: null,
        status: { [Op.in]: ["INTAKE", "TO_REPAIR"] },
      },
      include: [
        {
          model: db.Customer,
          as: "customer",
          attributes: ["id", "name", "phone"],
        },
        {
          model: db.Device,
          as: "device",
          attributes: ["id", "brand", "model", "description"],
        },
      ],
      limit: 20,
      order: [["createdAt", "ASC"]],
    });

     
    res.json({
      current_month_stats: {
        total_repairs_completed: completedThisMonth,
        total_earnings: Number(totalEarnings.toFixed(2)),
        average_completion_time_hours: avgCompletionHours,
        repairs_in_progress: inProgress.length,
      },
      my_active_repairs: inProgress.slice(0, 20),
      pending_repairs: pendingRepairs,
      performance_trend: performanceTrend,
      success_rate: Number(successRate.toFixed(1)),
    });
    
  } catch (err) {
    console.error("Technician dashboard error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/dashboard/front-desk
router.get("/front-desk", fdOrAdmin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      newIntakesToday,
      allRepairs,
      monthPayments,
      recentRepairs,
      repairsWithPayments,
    ] = await Promise.all([
      db.Repair.count({
        where: { intakeAt: { [Op.gte]: todayStart } },
      }),
      db.Repair.findAll({
        where: { status: { [Op.ne]: "DELIVERED" } },
        include: [
          {
            model: db.Customer,
            as: "customer",
            attributes: ["id", "name", "phone"],
          },
          {
            model: db.Device,
            as: "device",
            attributes: ["id", "brand", "model"],
          },
          { model: db.Payment, as: "payments" },
        ],
      }),
      db.Payment.sum("amount", {
        where: { receivedAt: { [Op.gte]: monthStart } },
      }),
      db.Repair.findAll({
        include: [
          {
            model: db.Customer,
            as: "customer",
            attributes: ["id", "name", "phone"],
          },
          {
            model: db.Device,
            as: "device",
            attributes: ["id", "brand", "model"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 20,
      }),
      db.Repair.findAll({
        include: [
          {
            model: db.Customer,
            as: "customer",
            attributes: ["id", "name", "phone"],
          },
          {
            model: db.Device,
            as: "device",
            attributes: ["id", "brand", "model"],
          },
          { model: db.Payment, as: "payments" },
        ],
      }),
    ]);

    const pendingDeliveries = allRepairs.filter((r) =>
      ["REPAIRED", "UNREPAIRABLE"].includes(r.status),
    );
    const totalCustomersServed = new Set(allRepairs.map((r) => r.customerId))
      .size;

    const pendingPayments = repairsWithPayments
      .filter((r) => !r.isLocked)
      .map((r) => {
        const paid = r.payments.reduce((s, p) => s + Number(p.amount), 0);
        const due = Number(r.totalCharges) - paid;
        return { ...r.toJSON(), paid, due };
      })
      .filter((r) => r.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 20);

    res.json({
      today_stats: {
        new_intakes: newIntakesToday,
        pending_deliveries: pendingDeliveries.length,
        total_customers_served: totalCustomersServed,
      },
      current_month_stats: {
        total_orders: allRepairs.length,
        revenue_collected: Number(monthPayments || 0),
      },
      recent_repairs: recentRepairs,
      pending_payments: pendingPayments,
    });
  } catch (err) {
    console.error("Front-desk dashboard error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/dashboard/logistics
router.get("/logistics", logOrAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [items, recentUsages, usageCounts] = await Promise.all([
      db.Inventory.findAll({
        where: { isActive: true },
        order: [["name", "ASC"]],
      }),
      db.InventoryUsage.findAll({
        where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
        include: [
          { model: db.Inventory, as: "inventory" },
          {
            model: db.Repair,
            as: "repair",
            include: [
              { model: db.Customer, as: "customer", attributes: ["name"] },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 30,
      }),
      db.InventoryUsage.findAll({
        where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
        attributes: ["inventoryId"],
        raw: true,
      }),
    ]);

    const usageByItem = {};
    usageCounts.forEach((u) => {
      usageByItem[u.inventoryId] = (usageByItem[u.inventoryId] || 0) + 1;
    });
    const invMap = new Map(items.map((i) => [i.id, i]));
    const mostUsed = Object.entries(usageByItem)
      .map(([id, count]) => ({ inventory: invMap.get(id), count }))
      .filter((x) => x.inventory)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((x) => ({ ...x.inventory.toJSON(), usage_count: x.count }));

    const totalValue = items.reduce(
      (s, i) => s + Number(i.quantity) * Number(i.unitPrice),
      0,
    );
    const lowStockItems = items.filter((i) => i.quantity < LOW_STOCK_THRESHOLD);

    res.json({
      inventory_overview: {
        low_stock_items: lowStockItems,
        total_items: items.length,
        total_value: Number(totalValue.toFixed(2)),
      },
      recent_usages: recentUsages,
      most_used_items: mostUsed,
    });
  } catch (err) {
    console.error("Logistics dashboard error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/dashboard/finance
router.get("/finance", finOrAdmin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayPayments, monthPayments, allPayments, repairsWithPayments] =
      await Promise.all([
        db.Payment.sum("amount", {
          where: { receivedAt: { [Op.gte]: todayStart } },
        }),
        db.Payment.findAll({
          where: { receivedAt: { [Op.gte]: monthStart } },
        }),
        db.Payment.findAll({
          include: [
            {
              model: db.Repair,
              as: "repair",
              include: [
                { model: db.Customer, as: "customer", attributes: ["name"] },
              ],
            },
          ],
          order: [["receivedAt", "DESC"]],
          limit: 50,
        }),
        db.Repair.findAll({
          include: [
            {
              model: db.Customer,
              as: "customer",
              attributes: ["id", "name", "phone"],
            },
            {
              model: db.Device,
              as: "device",
              attributes: ["id", "brand", "model"],
            },
            { model: db.Payment, as: "payments" },
          ],
        }),
      ]);

    const methodBreakdown = { CASH: 0, CARD: 0, BANK_TRANSFER: 0, OTHER: 0 };
    monthPayments.forEach((p) => {
      methodBreakdown[p.method] =
        (methodBreakdown[p.method] || 0) + Number(p.amount);
    });

    const pendingBills = repairsWithPayments
      .filter((r) => !r.isLocked)
      .map((r) => {
        const paid = r.payments.reduce((s, p) => s + Number(p.amount), 0);
        const due = Number(r.totalCharges) - paid;
        return { ...r.toJSON(), paid, due };
      })
      .filter((r) => r.due > 0);

    const outstandingPayments = pendingBills.reduce((s, r) => s + r.due, 0);
    const totalRevenue = (monthPayments || []).reduce(
      (s, p) => s + Number(p.amount),
      0,
    );

    res.json({
      today_collections: Number(todayPayments || 0),
      current_month: {
        total_revenue: totalRevenue,
        outstanding_payments: Number(outstandingPayments.toFixed(2)),
        payment_method_breakdown: methodBreakdown,
      },
      recent_payments: allPayments,
      pending_bills: pendingBills.slice(0, 30),
    });
  } catch (err) {
    console.error("Finance dashboard error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/dashboard/manager
router.get("/manager", mgrOrAdmin, async (req, res) => {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [repairs, technicians, monthCompleted] = await Promise.all([
      db.Repair.findAll({
        where: { status: { [Op.notIn]: ["DELIVERED"] } },
        include: [
          { model: db.User, as: "assignedTo", attributes: ["id", "name"] },
          { model: db.Customer, as: "customer", attributes: ["name"] },
        ],
      }),
      db.User.findAll({
        include: [
          {
            model: db.Role,
            as: "role",
            where: { code: "TECHNICIAN" },
            required: true,
          },
        ],
        attributes: ["id", "name"],
      }),
      db.Repair.count({
        where: {
          status: { [Op.in]: ["REPAIRED", "UNREPAIRABLE", "DELIVERED"] },
          completedAt: {
            [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
    ]);

    const statusDistribution = {};
    Object.values(REPAIR_STATUS).forEach((s) => (statusDistribution[s] = 0));
    repairs.forEach((r) => {
      statusDistribution[r.status] = (statusDistribution[r.status] || 0) + 1;
    });

    const staffUtilization = technicians.map((t) => {
      const assigned = repairs.filter((r) => r.assignedToUserId === t.id);
      const inProgress = assigned.filter((r) =>
        ["TO_REPAIR", "IN_REPAIR"].includes(r.status),
      );
      return {
        technicianId: t.id,
        technicianName: t.name,
        assignedCount: assigned.length,
        inProgressCount: inProgress.length,
      };
    });

    const bottlenecks = repairs.filter((r) => {
      const updated = r.updatedAt || r.createdAt;
      return (
        new Date(updated) < fortyEightHoursAgo && !["INTAKE"].includes(r.status)
      );
    });

    res.json({
      operations_overview: {
        active_repairs: repairs.length,
        staff_utilization: staffUtilization,
        status_distribution: statusDistribution,
      },
      performance_metrics: {
        month_completed: monthCompleted,
      },
      bottlenecks: bottlenecks.slice(0, 20),
    });
  } catch (err) {
    console.error("Manager dashboard error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/dashboard/admin
router.get("/admin", adminOnly, async (req, res) => {
  try {
    const [users, roles, repairCount, paymentSum] = await Promise.all([
      db.User.findAll({
        where: { isActive: true },
        include: [{ model: db.Role, as: "role" }],
      }),
      db.Role.findAll({ order: [["code", "ASC"]] }),
      db.Repair.count(),
      db.Payment.sum("amount"),
    ]);

    const rolesDistribution = {};
    users.forEach((u) => {
      const code = u.role?.code || "unknown";
      rolesDistribution[code] = (rolesDistribution[code] || 0) + 1;
    });

    res.json({
      system_overview: {
        total_repairs: repairCount,
        total_revenue: Number(paymentSum || 0),
        active_users: users.length,
      },
      user_management_summary: {
        active_users: users.length,
        roles_distribution: rolesDistribution,
      },
      configuration_status: {
        roles_configured: roles.length,
      },
    });
  } catch (err) {
    console.error("Admin dashboard error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/dashboard/summary
router.get(
  "/summary",
  checkPermission(["view:dashboard", "*:*"]),
  async (req, res) => {
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const [
        totalRepairs,
        openRepairs,
        totalRevenueResult,
        todayRevenueResult,
      ] = await Promise.all([
        db.Repair.count(),
        db.Repair.count({
          where: {
            status: {
              [Op.in]: ["INTAKE", "TO_REPAIR", "IN_REPAIR"],
            },
          },
        }),
        db.Repair.sum("totalCharges"),
        db.Payment.sum("amount", {
          where: {
            receivedAt: { [Op.gte]: todayStart },
          },
        }),
      ]);

      res.json({
        totalRepairs,
        openRepairs,
        totalRevenue: Number(totalRevenueResult || 0),
        todayRevenue: Number(todayRevenueResult || 0),
      });
    } catch (err) {
      console.error("Dashboard error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;

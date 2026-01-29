import express from "express";
import { prisma } from "../prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { PERMISSIONS } from "../config.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/summary",
  authorize([PERMISSIONS.VIEW_DASHBOARD]),
  async (req, res) => {
    try {
      const [
        totalRepairs,
        openRepairs,
        totalRevenueAgg,
        todayRevenueAgg,
      ] = await Promise.all([
        prisma.repair.count(),
        prisma.repair.count({
          where: {
            status: {
              in: ["INTAKE", "TO_REPAIR", "IN_REPAIR"],
            },
          },
        }),
        prisma.repair.aggregate({
          _sum: { totalCharges: true },
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            receivedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      res.json({
        totalRepairs,
        openRepairs,
        totalRevenue: Number(totalRevenueAgg._sum.totalCharges || 0),
        todayRevenue: Number(todayRevenueAgg._sum.amount || 0),
      });
    } catch (err) {
      console.error("Dashboard error", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;


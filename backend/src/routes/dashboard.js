import express from "express";
import { Op } from "sequelize";
import db, { sequelize } from "../db.js";
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
            receivedAt: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
            },
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
  }
);

export default router;


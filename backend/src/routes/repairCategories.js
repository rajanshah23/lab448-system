import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/repair-categories
 * Returns the full Category1 → Category2 → Category3 tree with flat rates.
 * Optionally ?format=flat returns a flat list with level/parentId for simpler frontend use.
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const format = (req.query.format || "tree").toLowerCase();
    const all = await db.RepairCategory.findAll({
      order: [
        ["level", "ASC"],
        ["name", "ASC"],
      ],
    });

    if (format === "flat") {
      return res.json(
        all.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
          level: c.level,
          flatRate: c.flatRate != null ? Number(c.flatRate) : null,
        }))
      );
    }

    const byId = new Map(all.map((c) => [c.id, c.get({ plain: true })]));
    const roots = [];

    all.forEach((c) => {
      const row = {
        id: c.id,
        name: c.name,
        level: c.level,
        flatRate: c.flatRate != null ? Number(c.flatRate) : null,
        children: [],
      };
      byId.set(c.id, row);
    });

    all.forEach((c) => {
      const row = byId.get(c.id);
      if (!c.parentId) {
        roots.push(row);
      } else {
        const parent = byId.get(c.parentId);
        if (parent) parent.children.push(row);
        else roots.push(row);
      }
    });

    res.json(roots);
  } catch (err) {
    console.error("Repair categories error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/repair-categories/:id
 * Returns a single category with flat rate (for validating leaf before intake).
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const category = await db.RepairCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      level: category.level,
      flatRate: category.flatRate != null ? Number(category.flatRate) : null,
    });
  } catch (err) {
    console.error("Repair category error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

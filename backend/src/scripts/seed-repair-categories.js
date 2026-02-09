/**
 * Seed repair categories: Category Level 1 → Level 2 → Level 3 with flat rates.
 * Data matches the hierarchical structure (e.g. Home Appliances → Cooling & Heating → Air Conditioning).
 * Run after db:sync: node src/scripts/seed-repair-categories.js
 */
import db, { sequelize } from "../db.js";

const FLAT_RATE_DEFAULT = 500; // placeholder ₹ for Level 3 categories

const categories = [
  // Level 1
  { name: "Home Appliances", parentName: null, level: 1, flatRate: null },
  // Level 2
  { name: "Appliances Parts & Accessories", parentName: "Home Appliances", level: 2, flatRate: null },
  { name: "Cooling & Heating", parentName: "Home Appliances", level: 2, flatRate: null },
  { name: "Irons & Garment Steamers", parentName: "Home Appliances", level: 2, flatRate: null },
  { name: "Kitchen Appliances", parentName: "Home Appliances", level: 2, flatRate: null },
  // Level 3 under Appliances Parts & Accessories
  { name: "Specialty Cookware Accessories", parentName: "Appliances Parts & Accessories", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Humidifier Parts & Accessories", parentName: "Appliances Parts & Accessories", level: 3, flatRate: FLAT_RATE_DEFAULT },
  // Level 3 under Cooling & Heating
  { name: "Air Conditioning", parentName: "Cooling & Heating", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Air Treatment", parentName: "Cooling & Heating", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Fans", parentName: "Cooling & Heating", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Heaters", parentName: "Cooling & Heating", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Water Heaters", parentName: "Cooling & Heating", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Exhaust Fans", parentName: "Cooling & Heating", level: 3, flatRate: FLAT_RATE_DEFAULT },
  // Level 3 under Irons & Garment Steamers
  { name: "Irons", parentName: "Irons & Garment Steamers", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Garment Steamers", parentName: "Irons & Garment Steamers", level: 3, flatRate: FLAT_RATE_DEFAULT },
  { name: "Garment Presses", parentName: "Irons & Garment Steamers", level: 3, flatRate: FLAT_RATE_DEFAULT },
  // Level 3 under Kitchen Appliances
  { name: "Refrigerators", parentName: "Kitchen Appliances", level: 3, flatRate: FLAT_RATE_DEFAULT },
];

async function seed() {
  try {
    await sequelize.authenticate();
    const existing = await db.RepairCategory.count();
    if (existing > 0) {
      console.log("Repair categories already seeded. Skipping.");
      process.exit(0);
      return;
    }

    const nameToId = new Map();
    for (const row of categories) {
      const parentId = row.parentName ? nameToId.get(row.parentName) ?? null : null;
      const rec = await db.RepairCategory.create({
        name: row.name,
        parentId,
        level: row.level,
        flatRate: row.flatRate,
      });
      nameToId.set(row.name, rec.id);
    }
    console.log(`Seeded ${categories.length} repair categories.`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();

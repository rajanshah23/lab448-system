/**
 * Seed roles with code and permissions. Run after db:sync.
 * Usage: node src/scripts/seed-roles.js
 */
import { Op } from "sequelize";
import db from "../db.js";

const ROLES = [
  {
    id: "role_tech",
    code: "TECHNICIAN",
    name: "Repair Army",
    description: "Performs repairs and updates job status",
    permissions: [
      "repair:view",
      "repair:update_status",
      "repair:add_notes",
      "inventory:request",
      "repair:use_inventory",
      "view:dashboard",
    ],
  },
  {
    id: "role_fd",
    code: "FRONT_DESK",
    name: "Command Desk",
    description: "Customer intake, job creation, coordination",
    permissions: [
      "customer:create",
      "device:create",
      "repair:create",
      "repair:intake",
      "repair:view_all",
      "payment:receive",
      "repair:payment",
      "view:dashboard",
    ],
  },
  {
    id: "role_log",
    code: "LOGISTICS",
    name: "Logistics Crew",
    description: "Inventory management and parts handling",
    permissions: [
      "inventory:manage",
      "manage:inventory",
      "inventory:assign_to_repair",
      "repair:view_pending_requests",
      "view:dashboard",
    ],
  },
  {
    id: "role_fin",
    code: "FINANCE",
    name: "Finance Desk",
    description: "Payments, reconciliation, refunds",
    permissions: [
      "payment:manage",
      "repair:view_billing",
      "repair:billing",
      "repair:payment",
      "reports:financial",
      "view:dashboard",
    ],
  },
  {
    id: "role_mgr",
    code: "MANAGER",
    name: "Operations Command",
    description: "Oversees operations and approvals",
    permissions: [
      "repair:view_all",
      "reports:operations",
      "user:view",
      "view:dashboard",
    ],
  },
  {
    id: "role_admin",
    code: "ADMIN",
    name: "HQ Access",
    description: "Full system access and configuration",
    permissions: ["*:*"],
  },
];

async function seedRoles() {
  try {
    console.log("Seeding roles...");
    for (const role of ROLES) {
      const existing = await db.Role.findOne({
        where: { [Op.or]: [{ code: role.code }, { id: role.id }] },
      });
      if (existing) {
        await existing.update({
          code: role.code,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
        });
        console.log(`  - Updated ${role.code}: ${role.name}`);
      } else {
        await db.Role.create({
          id: role.id,
          code: role.code,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
        });
        console.log(`  - Created ${role.code}: ${role.name}`);
      }
    }
    console.log("✓ Roles seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  }
}

seedRoles();

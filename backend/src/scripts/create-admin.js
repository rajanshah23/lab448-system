/**
 * Create the first admin user from the command line (same logic as bootstrap-admin API).
 * Run inside the container to see full errors: docker compose exec backend node src/scripts/create-admin.js <email> <password> <name>
 * Example: docker compose exec backend node src/scripts/create-admin.js admin@lab448.com admin123456 Administrator
 */
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import db from "../db.js";

const [email, password, name] = process.argv.slice(2);
if (!email || !password || !name) {
  console.error("Usage: node src/scripts/create-admin.js <email> <password> <name>");
  console.error("Example: node src/scripts/create-admin.js admin@lab448.com admin123456 Administrator");
  process.exit(1);
}

async function createAdmin() {
  try {
    let adminRole = await db.Role.findOne({
      where: { [Op.or]: [{ code: "ADMIN" }, { name: "admin" }] },
    });
    if (!adminRole) {
      console.log("Creating ADMIN role...");
      adminRole = await db.Role.create({
        id: "role_admin",
        code: "ADMIN",
        name: "HQ Access",
        description: "Full system access and configuration",
        permissions: ["*:*"],
      });
    }

    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      console.error("User already exists:", email);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      email,
      passwordHash,
      name,
      roleId: adminRole.id,
    });

    console.log("✓ Admin created:", user.email, "(id:", user.id, ")");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

createAdmin();

/**
 * Restore a user's role to ADMIN. Use when an admin was accidentally demoted.
 * Usage: node src/scripts/fix-admin.js <email>
 * Example: node src/scripts/fix-admin.js admin@example.com
 */
import db from "../db.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node src/scripts/fix-admin.js <email>");
  process.exit(1);
}

async function fixAdmin() {
  try {
    const adminRole = await db.Role.findOne({ where: { code: "ADMIN" } });
    if (!adminRole) {
      console.error("ADMIN role not found. Run: npm run db:seed-roles");
      process.exit(1);
    }

    const user = await db.User.findOne({
      where: { email: email.trim() },
      include: [{ model: db.Role, as: "role" }],
    });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    await user.update({
      roleId: adminRole.id,
      commissionRate: 0,
      technicianLevel: null,
      technicianLevelDisplay: null,
    });

    console.log(`✓ Restored ${user.name} (${user.email}) to ADMIN role`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

fixAdmin();

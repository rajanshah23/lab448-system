import { sequelize } from "../db.js";
import models from "../db.js";

const syncDatabase = async () => {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("✓ Database connection established");

    console.log("\nSyncing database schema...");
    await sequelize.sync({ alter: true });
    console.log("✓ Database schema synced successfully");

    console.log("\nAll models:");
    Object.keys(models).forEach((modelName) => {
      console.log(`  - ${modelName}`);
    });

    console.log("\n✓ Database setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Database sync failed:", error);
    process.exit(1);
  }
};

syncDatabase();

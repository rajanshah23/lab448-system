import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { PORT } from "./config.js";
import { sequelize } from "./db.js";
import authRoutes from "./routes/auth.js";
import repairsRoutes from "./routes/repairs.js";
import inventoryRoutes from "./routes/inventory.js";
import dashboardRoutes from "./routes/dashboard.js";
import usersRoutes from "./routes/users.js";
import repairCategoriesRoutes from "./routes/repairCategories.js";
import customersRoutes from "./routes/customers.js";

const app = express();

// Disable automatic ETag generation for API responses to avoid conditional
// responses (304) which can confuse XHR clients. Also set no-store cache
// headers for API routes.
app.set("etag", false);
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/repairs", repairsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/repair-categories", repairCategoriesRoutes);
app.use("/api/customers", customersRoutes);

// In production (e.g. Docker), serve built frontend from ./public (SPA fallback)
const publicPath = path.join(process.cwd(), "public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Unexpected error" });
});

// Test database connection and start server
sequelize
  .authenticate()
  .then(() => {
    console.log("✓ Database connection established");
    app.listen(PORT, () => {
      console.log(`✓ Repair shop backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("✗ Unable to connect to database:", err);
    process.exit(1);
  });


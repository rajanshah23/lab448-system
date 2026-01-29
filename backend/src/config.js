import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const JWT_EXPIRES_IN = "8h";

export const REPAIR_STATUS = {
  INTAKE: "INTAKE",
  TO_REPAIR: "TO_REPAIR",
  IN_REPAIR: "IN_REPAIR",
  REPAIRED: "REPAIRED",
  UNREPAIRABLE: "UNREPAIRABLE",
  DELIVERED: "DELIVERED",
};

export const ALLOWED_STATUS_TRANSITIONS = {
  INTAKE: ["TO_REPAIR"],
  // Allow reverting back to INTAKE from TO_REPAIR to support manual corrections
  TO_REPAIR: ["IN_REPAIR", "INTAKE"],
  IN_REPAIR: ["REPAIRED", "UNREPAIRABLE"],
  REPAIRED: ["DELIVERED"],
  UNREPAIRABLE: ["DELIVERED"],
  DELIVERED: [],
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: "view:dashboard",
  MANAGE_INVENTORY: "manage:inventory",
  INTAKE_REPAIR: "repair:intake",
  UPDATE_REPAIR_STATUS: "repair:update_status",
  USE_INVENTORY: "repair:use_inventory",
  MANAGE_BILLING: "repair:billing",
  TAKE_PAYMENT: "repair:payment",
  MANAGE_USERS: "users:manage",
};

